import { QueryCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLE_NAME } from "./client";
import { sendWhatsAppWithButtons } from "../sendWhatsApp";
import { getService } from "../barberServices";
import { getTimeWindowById } from "../timeWindows";
import type { Booking } from "../types/booking";

// Default area for /boeken flow (Rotterdam region)
const DEFAULT_AREA = "rotterdam-ridderkerk";

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

/**
 * Dispatch booking to providers via WhatsApp (Wave 1)
 * This is for the /boeken flow which uses SK="META"
 */
export async function dispatchBookingToProviders(
  booking: Booking
): Promise<DispatchResult> {
  // Get service details for the message
  const service = getService(booking.serviceType);
  const timeWindow = getTimeWindowById(booking.timeWindowId);

  if (!service || !timeWindow) {
    return {
      dispatched: false,
      wave: 1,
      providersNotified: 0,
      skipped: true,
      reason: "invalid_service_or_timewindow",
    };
  }

  // Query providers in the default area
  const providerResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      FilterExpression: "isActive = :active AND attribute_exists(whatsappPhone)",
      ExpressionAttributeValues: {
        ":pk": `AREA#${DEFAULT_AREA}`,
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

  if (providers.length === 0) {
    console.log(`[Dispatch] No providers available for area ${DEFAULT_AREA}`);
    return {
      dispatched: false,
      wave: 1,
      providersNotified: 0,
      skipped: true,
      reason: "no_providers",
    };
  }

  const now = new Date().toISOString();
  const deadline = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const payout = formatPayout(booking.amount);

  // Send WhatsApp to each provider
  for (const provider of providers) {
    await sendWhatsAppWithButtons(provider.whatsappPhone, {
      bookingId: booking.bookingId,
      serviceName: service.name,
      timeWindowLabel: `${booking.date} - ${timeWindow.label}`,
      place: "Rotterdam / Ridderkerk",
      payout,
    });

    // Record the broadcast
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `BOOKING#${booking.bookingId}`,
          SK: `BROADCAST#${now}#PROVIDER#${provider.providerId}`,
          type: "BROADCAST",
          providerId: provider.providerId,
          sentAt: now,
          wave: 1,
          area: DEFAULT_AREA,
          status: "SENT",
        },
      })
    );
  }

  // Record the dispatch event
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `BOOKING#${booking.bookingId}`,
        SK: `EVENT#${now}#broadcast_sent`,
        type: "EVENT",
        eventName: "broadcast_sent",
        at: now,
        meta: { wave: 1, providerCount: providers.length },
      },
    })
  );

  // Update booking with dispatch metadata
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BOOKING#${booking.bookingId}`, SK: "META" },
      UpdateExpression:
        "SET dispatchStartedAt = :started, assignmentDeadline = :deadline, updatedAt = :now",
      ExpressionAttributeValues: {
        ":started": now,
        ":deadline": deadline,
        ":now": now,
      },
    })
  );

  console.log(
    `[Dispatch] Booking ${booking.bookingId} dispatched to ${providers.length} providers`
  );

  return {
    dispatched: true,
    wave: 1,
    providersNotified: providers.length,
  };
}
