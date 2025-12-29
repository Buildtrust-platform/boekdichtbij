/**
 * Twilio WhatsApp Inbound Webhook
 *
 * CONFIGURATION REQUIREMENTS:
 * - TWILIO_AUTH_TOKEN must be set for signature verification
 * - NEXT_PUBLIC_APP_URL must match the exact URL configured in Twilio console
 * - Twilio webhook URL must be: {NEXT_PUBLIC_APP_URL}/api/whatsapp/inbound
 *
 * NOTE: If a reverse proxy, CDN, or load balancer modifies the request URL,
 * signature validation will fail. Ensure URL consistency between Twilio
 * console configuration and NEXT_PUBLIC_APP_URL.
 *
 * LOCAL DEVELOPMENT:
 * For local testing without ngrok, include header:
 *   x-dev-bypass: {OPS_TOKEN}
 * This bypass only works when NODE_ENV !== "production".
 */

import {
  GetCommand,
  QueryCommand,
  UpdateCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { sendWhatsApp } from "@/lib/twilio";
import { COPY } from "@/lib/copy";
import { deleteAssignmentDeadlineSchedule, deleteWave2Schedule } from "@/lib/scheduler";
import { verifyTwilioSignature } from "@/lib/twilioVerify";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const OPS_TOKEN = process.env.OPS_TOKEN;

interface Booking {
  bookingId: string;
  status: string;
  area: string;
  createdAt: string;
  serviceName: string;
  timeWindowLabel: string;
  address: string;
  postcode: string;
  place: string;
  customerName: string;
  phone: string;
  payoutCents: number;
  acceptCode?: string;
}

function formatPayout(cents: number): string {
  const euros = cents / 100;
  return euros % 1 === 0 ? euros.toString() : euros.toFixed(2);
}

function buildWinnerDetailsMessage(booking: Booking): string {
  const payout = formatPayout(booking.payoutCents);
  return `${COPY.acceptance.bookingDetails}

${COPY.acceptance.service}: ${booking.serviceName}
${COPY.acceptance.timeSlot}: ${booking.timeWindowLabel}
${COPY.acceptance.address}: ${booking.address}, ${booking.postcode} ${booking.place}
${COPY.acceptance.customerName}: ${booking.customerName}
${COPY.acceptance.phone}: ${booking.phone}

${COPY.acceptance.payout}: €${payout}`;
}

function twimlResponse(message?: string): Response {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/xml" },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractAcceptCode(body: string): string | null {
  // Normalize: uppercase and trim
  const text = body.trim().toUpperCase();

  // Patterns to match:
  // "JA ABCDE"
  // "JA CODE ABCDE"
  // "JA CODE: ABCDE"
  // "JA\nCODE: ABCDE"
  // Just extract alphanumeric code after JA

  // First check if starts with JA
  if (!text.startsWith("JA")) {
    return null;
  }

  // Remove "JA" prefix
  let remainder = text.slice(2).trim();

  // Remove optional "CODE" or "CODE:" prefix
  remainder = remainder.replace(/^CODE\s*:?\s*/i, "");

  // Extract first word (the code)
  const match = remainder.match(/^([A-Z0-9]{4,6})/);
  if (match) {
    return match[1];
  }

  return null;
}

async function findProviderByPhone(phoneE164: string): Promise<string | null> {
  // Try phone mapping item first
  const mapResult = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PHONE#${phoneE164}`, SK: "PROVIDER" },
    })
  );

  if (mapResult.Item?.providerId) {
    return mapResult.Item.providerId as string;
  }

  return null;
}

async function findBookingByAcceptCode(code: string): Promise<Booking | null> {
  // Look up ACCEPT mapping item
  const mapResult = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `ACCEPT#${code}`, SK: "BOOKING" },
    })
  );

  if (!mapResult.Item?.bookingId) {
    return null;
  }

  const bookingId = mapResult.Item.bookingId as string;

  // Load full booking
  const bookingResult = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
    })
  );

  if (!bookingResult.Item) {
    return null;
  }

  return bookingResult.Item as Booking;
}

async function updateBroadcastStatuses(
  bookingId: string,
  winnerProviderId: string
): Promise<void> {
  // Query all BROADCAST items for this booking
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `BOOKING#${bookingId}`,
        ":skPrefix": "BROADCAST#",
      },
    })
  );

  const now = new Date().toISOString();

  for (const item of result.Items || []) {
    const providerId = item.providerId as string;
    const sk = item.SK as string;
    const newStatus = providerId === winnerProviderId ? "WON" : "LOST";

    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `BOOKING#${bookingId}`, SK: sk },
        UpdateExpression: "SET #status = :status, updatedAt = :now",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":status": newStatus,
          ":now": now,
        },
      })
    );
  }
}

async function notifyLosers(
  bookingId: string,
  winnerProviderId: string
): Promise<void> {
  // Query BROADCAST items to find other providers
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `BOOKING#${bookingId}`,
        ":skPrefix": "BROADCAST#",
      },
    })
  );

  const notified = new Set<string>();

  for (const item of result.Items || []) {
    const providerId = item.providerId as string;
    const providerPhone = item.providerPhone as string;

    if (providerId === winnerProviderId) continue;
    if (notified.has(providerId)) continue;
    if (!providerPhone) continue;

    notified.add(providerId);

    try {
      await sendWhatsApp(providerPhone, COPY.acceptance.alreadyAssigned);
    } catch (err) {
      console.error("[inbound] Failed to notify loser:", providerId, err);
    }
  }
}

/**
 * Parse form-urlencoded body into key/value pairs
 */
function parseFormBody(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  const pairs = body.split("&");
  for (const pair of pairs) {
    const [key, value] = pair.split("=");
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value || "");
    }
  }
  return params;
}

export async function POST(request: Request) {
  // Read raw body for signature verification
  const rawBody = await request.text();

  // Parse form-urlencoded params
  const params = parseFormBody(rawBody);

  // Get Twilio signature header (case-insensitive)
  const twilioSignature =
    request.headers.get("X-Twilio-Signature") ||
    request.headers.get("x-twilio-signature") ||
    "";

  // Construct the webhook URL as Twilio sees it
  const webhookUrl = `${APP_URL}/api/whatsapp/inbound`;

  // Check for local dev bypass (only in non-production)
  const isProduction = process.env.NODE_ENV === "production";
  const devBypass = request.headers.get("x-dev-bypass");
  const bypassAllowed =
    !isProduction && OPS_TOKEN && devBypass === OPS_TOKEN;

  // Verify signature (unless bypass is allowed)
  if (!bypassAllowed) {
    const isValid = verifyTwilioSignature(params, twilioSignature, webhookUrl);
    if (!isValid) {
      console.warn("[inbound] Invalid Twilio signature rejected");
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  } else {
    console.log("[inbound] Dev bypass accepted");
  }

  // Extract From and Body from parsed params
  const from = params.From || null;
  const body = params.Body || null;

  console.log("[inbound] Received from:", from, "body:", body);

  if (!from || !body) {
    return twimlResponse();
  }

  // Extract phone number (remove whatsapp: prefix if present)
  const phoneE164 = from.startsWith("whatsapp:")
    ? from.slice("whatsapp:".length)
    : from;

  const bodyTrim = body.trim().toUpperCase();

  // Check if message starts with JA
  if (!bodyTrim.startsWith("JA")) {
    // Not a JA response, ignore silently
    return twimlResponse();
  }

  // Extract accept code
  const acceptCode = extractAcceptCode(body);

  if (!acceptCode) {
    // JA without valid code
    return twimlResponse(COPY.acceptance.invalidCode);
  }

  // Find provider by phone
  const providerId = await findProviderByPhone(phoneE164);
  if (!providerId) {
    console.log("[inbound] Provider not found for phone:", phoneE164);
    return twimlResponse();
  }

  // Find booking by accept code
  const booking = await findBookingByAcceptCode(acceptCode);
  if (!booking) {
    console.log("[inbound] Booking not found for code:", acceptCode);
    return twimlResponse(COPY.acceptance.invalidCode);
  }

  // Check booking status
  if (booking.status !== "PENDING_ASSIGNMENT") {
    console.log("[inbound] Booking not assignable:", booking.bookingId, booking.status);
    return twimlResponse(COPY.acceptance.alreadyAssigned);
  }

  const now = new Date().toISOString();

  // Race-safe assignment with conditional update
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `BOOKING#${booking.bookingId}`, SK: "BOOKING" },
        UpdateExpression: `
          SET #status = :assigned,
              assignedProviderId = :providerId,
              acceptedAt = :now,
              updatedAt = :now,
              GSI1PK = :gsi1pk,
              GSI1SK = :gsi1sk
        `,
        ConditionExpression:
          "#status = :pending AND attribute_not_exists(assignedProviderId)",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":assigned": "ASSIGNED",
          ":pending": "PENDING_ASSIGNMENT",
          ":providerId": providerId,
          ":now": now,
          ":gsi1pk": `AREA#${booking.area}#STATUS#ASSIGNED`,
          ":gsi1sk": `CREATED#${booking.createdAt}#BOOKING#${booking.bookingId}`,
        },
      })
    );
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      console.log("[inbound] Race lost for booking:", booking.bookingId);
      return twimlResponse(COPY.acceptance.alreadyAssigned);
    }
    console.error("[inbound] DynamoDB error:", error);
    return twimlResponse();
  }

  console.log("[inbound] Booking assigned:", booking.bookingId, "to provider:", providerId);

  // Delete the deadline schedule (fire-and-forget, don't block webhook response)
  void deleteAssignmentDeadlineSchedule(booking.bookingId).catch((err) => {
    console.error("[inbound] Failed to delete deadline schedule (non-fatal):", booking.bookingId, err);
  });

  // Delete the Wave 2 schedule (fire-and-forget, no longer needed since assigned)
  void deleteWave2Schedule(booking.bookingId).catch((err) => {
    console.error("[inbound] Failed to delete Wave 2 schedule (non-fatal):", booking.bookingId, err);
  });

  // Write provider_accepted event
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `BOOKING#${booking.bookingId}`,
        SK: `EVENT#${now}#provider_accepted`,
        type: "EVENT",
        eventName: "provider_accepted",
        at: now,
        meta: { providerId },
      },
    })
  );

  // Write booking_assigned event (slightly offset timestamp for ordering)
  const assignedAt = new Date(Date.now() + 1).toISOString();
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `BOOKING#${booking.bookingId}`,
        SK: `EVENT#${assignedAt}#booking_assigned`,
        type: "EVENT",
        eventName: "booking_assigned",
        at: assignedAt,
        meta: { providerId },
      },
    })
  );

  // Update BROADCAST statuses (WON/LOST)
  await updateBroadcastStatuses(booking.bookingId, providerId);

  // Notify winner with two messages
  try {
    await sendWhatsApp(
      phoneE164,
      `${COPY.acceptance.assignedConfirm}\n\n${COPY.acceptance.detailsFollow}`
    );
    await sendWhatsApp(phoneE164, buildWinnerDetailsMessage(booking));
  } catch (err) {
    console.error("[inbound] Failed to notify winner:", err);
  }

  // Notify losers
  await notifyLosers(booking.bookingId, providerId);

  // Return empty TwiML (messages sent via API)
  return twimlResponse();
}
