import {
  GetCommand,
  QueryCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { sendWhatsApp } from "@/lib/twilio";
import { buildBroadcastMessage } from "@/lib/broadcastMessage";

interface Booking {
  bookingId: string;
  status: string;
  area: string;
  serviceName: string;
  timeWindowLabel: string;
  place: string;
  payoutCents: number;
  acceptCode?: string;
}

interface Provider {
  providerId: string;
  whatsappPhone: string;
  isActive: boolean;
}

function generateAcceptCode(): string {
  // Generate 5-char uppercase alphanumeric code
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1 to avoid confusion
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface DispatchResult {
  sent: number;
  providers: { providerId: string; twilioSid: string }[];
}

export async function dispatchWave1(bookingId: string): Promise<DispatchResult> {
  // Load booking
  const bookingResult = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
    })
  );

  if (!bookingResult.Item) {
    console.log("[dispatchWave1] Booking not found:", bookingId);
    return { sent: 0, providers: [] };
  }

  const booking = bookingResult.Item as Booking;

  // Validate status
  if (booking.status !== "PENDING_ASSIGNMENT") {
    console.log("[dispatchWave1] Status not PENDING_ASSIGNMENT:", booking.status);
    return { sent: 0, providers: [] };
  }

  // Anti-duplicate guard: check if BROADCAST items already exist
  const existingBroadcasts = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `BOOKING#${bookingId}`,
        ":skPrefix": "BROADCAST#",
      },
      Limit: 1,
    })
  );

  if (existingBroadcasts.Items && existingBroadcasts.Items.length > 0) {
    console.log("[dispatchWave1] Already dispatched:", bookingId);
    return { sent: 0, providers: [] };
  }

  // Generate or use existing acceptCode
  let acceptCode = booking.acceptCode;
  if (!acceptCode) {
    acceptCode = generateAcceptCode();

    // Update booking with acceptCode
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
        UpdateExpression: "SET acceptCode = :code, updatedAt = :now",
        ExpressionAttributeValues: {
          ":code": acceptCode,
          ":now": new Date().toISOString(),
        },
      })
    );

    // Create ACCEPT mapping item for code lookup
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `ACCEPT#${acceptCode}`,
          SK: "BOOKING",
          type: "ACCEPT_MAP",
          bookingId,
          createdAt: new Date().toISOString(),
        },
      })
    );

    console.log("[dispatchWave1] Generated acceptCode:", acceptCode, "for booking:", bookingId);
  }

  // Query providers by area using GSI2
  const providerResult = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `AREA#${booking.area}`,
      },
      ScanIndexForward: true, // Lower SCORE# values first (inverted score)
    })
  );

  // Select first 3 active providers with whatsappPhone and completed claim
  const eligibleProviders = (providerResult.Items || [])
    .filter((p): p is Provider & Record<string, unknown> => {
      return (
        typeof p.providerId === "string" &&
        typeof p.whatsappPhone === "string" &&
        p.whatsappPhone.length > 0 &&
        p.isActive === true &&
        !!p.claimedAt // Must have completed claim
      );
    })
    .slice(0, 3);

  if (eligibleProviders.length === 0) {
    console.log("[dispatchWave1] No eligible providers for area:", booking.area);
    return { sent: 0, providers: [] };
  }

  const now = new Date().toISOString();

  // Build message using shared builder
  const messageBody = buildBroadcastMessage({
    serviceName: booking.serviceName,
    timeWindowLabel: booking.timeWindowLabel,
    place: booking.place,
    area: booking.area,
    payoutCents: booking.payoutCents,
    acceptCode,
  });

  const results: { providerId: string; twilioSid: string }[] = [];

  // Send WhatsApp to each provider and record BROADCAST items
  for (const provider of eligibleProviders) {
    try {
      const { sid } = await sendWhatsApp(provider.whatsappPhone, messageBody);

      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `BOOKING#${bookingId}`,
            SK: `BROADCAST#${now}#PROVIDER#${provider.providerId}`,
            type: "BROADCAST",
            providerId: provider.providerId,
            providerPhone: provider.whatsappPhone,
            sentAt: now,
            wave: 1,
            status: "SENT",
            twilioSid: sid,
          },
        })
      );

      results.push({ providerId: provider.providerId, twilioSid: sid });
      console.log("[dispatchWave1] Sent to provider:", provider.providerId, "SID:", sid);
    } catch (err) {
      console.error("[dispatchWave1] Failed to send to provider:", provider.providerId, err);
    }
  }

  return { sent: results.length, providers: results };
}
