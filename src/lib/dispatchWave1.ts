import {
  GetCommand,
  QueryCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { sendWhatsAppWithButtons } from "@/lib/sendWhatsApp";

interface Booking {
  bookingId: string;
  status: string;
  area: string;
  serviceName: string;
  timeWindowLabel: string;
  place: string;
  payoutCents: number;
  dispatchStartedAt?: string;
}

interface Provider {
  providerId: string;
  whatsappPhone: string;
  isActive: boolean;
}

function formatPayout(cents: number): string {
  const euros = cents / 100;
  return euros % 1 === 0 ? euros.toString() : euros.toFixed(2);
}

export interface DispatchResult {
  dispatched: boolean;
  wave: number;
  providersNotified: number;
  skipped?: boolean;
  reason?: string;
}

export async function dispatchWave1(bookingId: string): Promise<DispatchResult> {
  const bookingResult = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
    })
  );

  if (!bookingResult.Item) {
    return { dispatched: false, wave: 1, providersNotified: 0, skipped: true, reason: "not_found" };
  }

  const booking = bookingResult.Item as Booking;

  if (booking.status !== "PENDING_ASSIGNMENT") {
    return { dispatched: false, wave: 1, providersNotified: 0, skipped: true, reason: "status_not_pending_assignment" };
  }

  if (booking.dispatchStartedAt) {
    return { dispatched: false, wave: 1, providersNotified: 0, skipped: true, reason: "already_dispatched" };
  }

  const now = new Date().toISOString();
  const deadline = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // Conditional update to claim dispatch - prevents double-dispatch race condition
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
        UpdateExpression:
          "SET dispatchStartedAt = :started, assignmentDeadline = :deadline, updatedAt = :now",
        ConditionExpression: "attribute_not_exists(dispatchStartedAt)",
        ExpressionAttributeValues: {
          ":started": now,
          ":deadline": deadline,
          ":now": now,
        },
      })
    );
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return { dispatched: false, wave: 1, providersNotified: 0, skipped: true, reason: "already_dispatched" };
    }
    throw error;
  }

  // Query providers for Wave 1
  const providerResult = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      FilterExpression: "isActive = :active AND attribute_exists(whatsappPhone)",
      ExpressionAttributeValues: {
        ":pk": `AREA#${booking.area}`,
        ":active": true,
      },
      ScanIndexForward: false,
      Limit: 10,
    })
  );

  const providers = (providerResult.Items || [])
    .filter(
      (p): p is Provider & Record<string, unknown> =>
        typeof p.providerId === "string" && typeof p.whatsappPhone === "string"
    )
    .slice(0, 3);

  const location = booking.place || booking.area;
  const payout = formatPayout(booking.payoutCents);

  // Send WhatsApp to each provider
  for (const provider of providers) {
    await sendWhatsAppWithButtons(provider.whatsappPhone, {
      bookingId,
      serviceName: booking.serviceName,
      timeWindowLabel: booking.timeWindowLabel,
      place: location,
      payout,
    });

    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `BOOKING#${bookingId}`,
          SK: `BROADCAST#${now}#PROVIDER#${provider.providerId}`,
          type: "BROADCAST",
          providerId: provider.providerId,
          sentAt: now,
          wave: 1,
          area: booking.area,
          status: "SENT",
        },
      })
    );
  }

  // Write broadcast_sent event
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `BOOKING#${bookingId}`,
        SK: `EVENT#${now}#broadcast_sent`,
        type: "EVENT",
        eventName: "broadcast_sent",
        at: now,
        meta: { wave: 1, providerCount: providers.length },
      },
    })
  );

  return {
    dispatched: true,
    wave: 1,
    providersNotified: providers.length,
  };
}
