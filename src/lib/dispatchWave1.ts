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
  serviceType?: string;
  timeWindowLabel: string;
  place: string;
  payoutCents: number;
  dispatchStartedAt?: string;
}

interface Provider {
  providerId: string;
  whatsappPhone: string;
  whatsappStatus?: string;
  isActive: boolean;
  genderServices?: string[];
}

function formatPayout(cents: number): string {
  const euros = cents / 100;
  return euros % 1 === 0 ? euros.toString() : euros.toFixed(2);
}

/**
 * Determine required gender from booking serviceType.
 * herenkapper => "men"
 * dameskapper => "women"
 * Default to "men" for backwards compatibility.
 */
function getRequiredGender(booking: Booking): "men" | "women" {
  const serviceType = booking.serviceType?.toLowerCase() || "";
  if (serviceType === "dameskapper") return "women";
  return "men";
}

/**
 * Check if provider serves the required gender.
 * Backwards compatibility: if genderServices is missing, treat as ["men"].
 */
function providerServesGender(provider: Provider, requiredGender: "men" | "women"): boolean {
  const genderServices = provider.genderServices ?? ["men"];
  return genderServices.includes(requiredGender);
}

export interface DispatchResult {
  dispatched: boolean;
  wave: number;
  providersNotified: number;
  skipped?: boolean;
  reason?: string;
  requiredGender?: "men" | "women";
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

  const requiredGender = getRequiredGender(booking);

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
      Limit: 20, // Fetch more to filter by gender
    })
  );

  // Filter providers by gender service and whatsapp validity
  const eligibleProviders = (providerResult.Items || [])
    .filter((p): p is Provider & Record<string, unknown> => {
      if (typeof p.providerId !== "string" || typeof p.whatsappPhone !== "string") return false;
      // Exclude providers with INVALID whatsapp status
      if (p.whatsappStatus === "INVALID") return false;
      // Check gender eligibility
      return providerServesGender(p as Provider, requiredGender);
    })
    .slice(0, 3);

  const location = booking.place || booking.area;
  const payout = formatPayout(booking.payoutCents);

  // Send WhatsApp to each provider
  for (const provider of eligibleProviders) {
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

  // Write broadcast_sent event with gender metadata
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `BOOKING#${bookingId}`,
        SK: `EVENT#${now}#broadcast_sent`,
        type: "EVENT",
        eventName: "broadcast_sent",
        at: now,
        meta: {
          wave: 1,
          providerCount: eligibleProviders.length,
          requiredGender,
          matchedProviders: eligibleProviders.length,
        },
      },
    })
  );

  return {
    dispatched: true,
    wave: 1,
    providersNotified: eligibleProviders.length,
    requiredGender,
  };
}
