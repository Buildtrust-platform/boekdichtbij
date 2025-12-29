/**
 * Lambda handler for Wave 2 dispatch.
 * Invoked by EventBridge Scheduler 5 minutes after PENDING_ASSIGNMENT.
 *
 * If booking is still PENDING_ASSIGNMENT:
 * 1. Query existing BROADCAST items to find already-notified providers
 * 2. Query next 5 eligible providers (excluding Wave 1)
 * 3. Send WhatsApp messages with accept code
 * 4. Write BROADCAST items for Wave 2
 *
 * IDEMPOTENCY:
 * - Checks for existing Wave 2 broadcasts before sending
 * - Uses deterministic BROADCAST SK to prevent duplicate writes
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import Twilio from "twilio";

// Environment variables
const TABLE_NAME = process.env.DDB_TABLE_NAME!;
const AWS_REGION = process.env.AWS_REGION || "eu-central-1";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM!;

// Initialize clients
const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
const ddb = DynamoDBDocumentClient.from(dynamoClient);
const twilioClient = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Dutch copy constants (must match src/lib/copy.ts)
const COPY = {
  dispatch: {
    broadcastHeader: "Nieuwe opdracht beschikbaar!",
    broadcastService: "Service",
    broadcastTimeSlot: "Tijdslot",
    broadcastLocation: "Locatie",
    broadcastPayout: "Vergoeding",
    broadcastAccept: "Stuur JA + code om te accepteren",
    broadcastCode: "Code",
  },
};

interface LambdaEvent {
  bookingId: string;
}

interface Booking {
  bookingId: string;
  status: string;
  area: string;
  serviceName: string;
  timeWindowLabel: string;
  place?: string;
  payoutCents: number;
  acceptCode: string;
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

/**
 * Build broadcast message (mirrors src/lib/broadcastMessage.ts)
 */
function buildBroadcastMessage(booking: Booking): string {
  const location = booking.place || booking.area;
  const payoutEuros = formatPayout(booking.payoutCents);

  return `${COPY.dispatch.broadcastHeader}

${COPY.dispatch.broadcastService}: ${booking.serviceName}
${COPY.dispatch.broadcastTimeSlot}: ${booking.timeWindowLabel}
${COPY.dispatch.broadcastLocation}: ${location}
${COPY.dispatch.broadcastPayout}: €${payoutEuros}

${COPY.dispatch.broadcastAccept}
${COPY.dispatch.broadcastCode}: ${booking.acceptCode}`;
}

/**
 * Send WhatsApp message via Twilio.
 * Handles TWILIO_WHATSAPP_FROM with or without whatsapp: prefix.
 */
async function sendWhatsApp(
  toE164: string,
  body: string
): Promise<{ sid: string }> {
  // Ensure "to" uses whatsapp: prefix
  const to = toE164.startsWith("whatsapp:") ? toE164 : `whatsapp:${toE164}`;

  // Ensure "from" uses whatsapp: prefix
  const from = TWILIO_WHATSAPP_FROM.startsWith("whatsapp:")
    ? TWILIO_WHATSAPP_FROM
    : `whatsapp:${TWILIO_WHATSAPP_FROM}`;

  const message = await twilioClient.messages.create({
    from,
    to,
    body,
  });
  return { sid: message.sid };
}

export async function handler(
  event: LambdaEvent
): Promise<{ statusCode: number; body: string }> {
  const { bookingId } = event;

  if (!bookingId) {
    console.error("[Wave2] Missing bookingId in event");
    return { statusCode: 400, body: "Missing bookingId" };
  }

  console.log("[Wave2] Processing booking:", bookingId);

  // ============================================================
  // STEP 1: Load booking and verify status
  // ============================================================
  let booking: Booking;
  try {
    const bookingResult = await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
      })
    );

    if (!bookingResult.Item) {
      console.log("[Wave2] Booking not found:", bookingId);
      return { statusCode: 200, body: "Booking not found" };
    }

    booking = bookingResult.Item as Booking;
  } catch (err) {
    console.error("[Wave2] Failed to load booking:", bookingId, err);
    return { statusCode: 200, body: "Failed to load booking" };
  }

  // Only process if still PENDING_ASSIGNMENT
  if (booking.status !== "PENDING_ASSIGNMENT") {
    console.log("[Wave2] Booking not PENDING_ASSIGNMENT:", bookingId, booking.status);
    return { statusCode: 200, body: `Status is ${booking.status}` };
  }

  // Must have acceptCode
  if (!booking.acceptCode) {
    console.error("[Wave2] No acceptCode for booking:", bookingId);
    return { statusCode: 200, body: "No acceptCode" };
  }

  // ============================================================
  // STEP 2: Query existing BROADCAST items to get already-notified providers
  // ============================================================
  const alreadyNotified = new Set<string>();
  let hasWave2 = false;

  try {
    let lastKey: Record<string, unknown> | undefined;

    do {
      const result = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
          ExpressionAttributeValues: {
            ":pk": `BOOKING#${bookingId}`,
            ":skPrefix": "BROADCAST#",
          },
          ExclusiveStartKey: lastKey,
        })
      );

      for (const item of result.Items || []) {
        const providerId = item.providerId as string;
        const wave = item.wave as number;

        if (providerId) {
          alreadyNotified.add(providerId);
        }

        // Check if Wave 2 already sent (idempotency check)
        if (wave === 2) {
          hasWave2 = true;
        }
      }

      lastKey = result.LastEvaluatedKey;
    } while (lastKey);
  } catch (err) {
    console.error("[Wave2] Failed to query existing broadcasts:", bookingId, err);
    return { statusCode: 200, body: "Failed to query broadcasts" };
  }

  // Idempotency: if Wave 2 already sent, exit
  if (hasWave2) {
    console.log("[Wave2] Already dispatched Wave 2 for:", bookingId);
    return { statusCode: 200, body: "Wave 2 already sent" };
  }

  console.log("[Wave2] Already notified providers:", Array.from(alreadyNotified));

  // ============================================================
  // STEP 3: Query providers by area (GSI2), exclude already notified
  // ============================================================
  const eligibleProviders: Provider[] = [];

  try {
    let lastKey: Record<string, unknown> | undefined;

    do {
      const result = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: "GSI2",
          KeyConditionExpression: "GSI2PK = :pk",
          ExpressionAttributeValues: {
            ":pk": `AREA#${booking.area}`,
          },
          ScanIndexForward: true, // Lower SCORE# values first (best providers)
          ExclusiveStartKey: lastKey,
        })
      );

      for (const item of result.Items || []) {
        // Stop if we have enough
        if (eligibleProviders.length >= 5) break;

        const providerId = item.providerId as string;
        const whatsappPhone = item.whatsappPhone as string;
        const isActive = item.isActive as boolean;
        const claimedAt = item.claimedAt as string | undefined;

        // Skip if already notified in Wave 1
        if (alreadyNotified.has(providerId)) continue;

        // Must be active with whatsappPhone and completed claim
        if (!isActive || !whatsappPhone || !claimedAt) continue;

        eligibleProviders.push({
          providerId,
          whatsappPhone,
          isActive,
        });
      }

      lastKey = result.LastEvaluatedKey;
    } while (lastKey && eligibleProviders.length < 5);
  } catch (err) {
    console.error("[Wave2] Failed to query providers:", bookingId, err);
    return { statusCode: 200, body: "Failed to query providers" };
  }

  if (eligibleProviders.length === 0) {
    console.log("[Wave2] No additional providers found for area:", booking.area);
    return { statusCode: 200, body: "No additional providers" };
  }

  console.log(
    "[Wave2] Found",
    eligibleProviders.length,
    "new providers for booking:",
    bookingId
  );

  // ============================================================
  // STEP 4: Send WhatsApp messages and write BROADCAST items
  // ============================================================
  const messageBody = buildBroadcastMessage(booking);
  const now = new Date().toISOString();
  let sentCount = 0;

  for (const provider of eligibleProviders) {
    let status: "SENT" | "FAILED" = "SENT";
    let twilioSid: string | undefined;
    let errorMessage: string | undefined;

    try {
      const result = await sendWhatsApp(provider.whatsappPhone, messageBody);
      twilioSid = result.sid;
      sentCount++;
      console.log("[Wave2] Sent to provider:", provider.providerId, "SID:", twilioSid);
    } catch (err) {
      status = "FAILED";
      errorMessage = err instanceof Error ? err.message : String(err);
      console.error("[Wave2] Failed to send to provider:", provider.providerId, err);
      // Continue to next provider
    }

    // Write BROADCAST item (deterministic SK for idempotency)
    try {
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
            wave: 2,
            status,
            ...(twilioSid && { twilioSid }),
            ...(errorMessage && { errorMessage }),
          },
        })
      );
    } catch (err) {
      console.error("[Wave2] Failed to write BROADCAST item:", provider.providerId, err);
      // Continue - message was sent, just failed to record
    }
  }

  console.log("[Wave2] Completed for booking:", bookingId, "sent:", sentCount);

  return {
    statusCode: 200,
    body: JSON.stringify({
      bookingId,
      wave: 2,
      sent: sentCount,
      total: eligibleProviders.length,
    }),
  };
}
