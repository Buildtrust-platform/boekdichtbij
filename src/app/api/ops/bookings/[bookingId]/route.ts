import { NextRequest, NextResponse } from "next/server";
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { requireOpsToken } from "@/lib/opsAuth";

interface RouteParams {
  params: Promise<{ bookingId: string }>;
}

interface Broadcast {
  providerId: string;
  providerPhone: string;
  status: string;
  twilioSid?: string;
  sentAt: string;
  updatedAt?: string;
}

interface Event {
  eventName: string;
  at: string;
  meta?: Record<string, unknown>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  // Check auth
  const authResult = requireOpsToken(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { bookingId } = await params;

  if (!bookingId) {
    return NextResponse.json({ error: "invalid_parameters" }, { status: 400 });
  }

  try {
    // Fetch booking
    const bookingResult = await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
      })
    );

    if (!bookingResult.Item) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Query broadcasts with begins_with
    const broadcastsResult = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": `BOOKING#${bookingId}`,
          ":skPrefix": "BROADCAST#",
        },
        ScanIndexForward: false,
      })
    );

    // Query events with begins_with
    const eventsResult = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": `BOOKING#${bookingId}`,
          ":skPrefix": "EVENT#",
        },
        ScanIndexForward: false,
      })
    );

    const broadcasts: Broadcast[] = (broadcastsResult.Items || []).map(
      (item) => ({
        providerId: item.providerId,
        providerPhone: item.providerPhone,
        status: item.status,
        twilioSid: item.twilioSid,
        sentAt: item.sentAt,
        updatedAt: item.updatedAt,
      })
    );

    const events: Event[] = (eventsResult.Items || []).map((item) => ({
      eventName: item.eventName,
      at: item.at,
      meta: item.meta,
    }));

    const booking = bookingResult.Item;

    return NextResponse.json({
      booking: {
        bookingId: booking.bookingId,
        status: booking.status,
        area: booking.area,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        serviceName: booking.serviceName,
        serviceId: booking.serviceId,
        timeWindowLabel: booking.timeWindowLabel,
        place: booking.place,
        address: booking.address,
        postcode: booking.postcode,
        customerName: booking.customerName,
        phone: booking.phone,
        email: booking.email,
        priceCents: booking.priceCents,
        payoutCents: booking.payoutCents,
        assignedProviderId: booking.assignedProviderId,
        acceptCode: booking.acceptCode,
        acceptedAt: booking.acceptedAt,
        stripeSessionId: booking.stripeSessionId,
        stripePaymentIntentId: booking.stripePaymentIntentId,
        paidAt: booking.paidAt,
        refundId: booking.refundId,
        refundedAt: booking.refundedAt,
        unfilledAt: booking.unfilledAt,
        assignmentDeadline: booking.assignmentDeadline,
      },
      broadcasts,
      events,
    });
  } catch (error) {
    console.error("[ops/bookings/[bookingId]] Query failed:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
