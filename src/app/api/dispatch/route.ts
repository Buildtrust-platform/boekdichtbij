import { NextResponse } from "next/server";
import {
  GetCommand,
  QueryCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
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

export async function POST(request: Request) {
  let body: { bookingId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { bookingId } = body;
  if (!bookingId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // 1) Load booking
  const bookingResult = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
    })
  );

  if (!bookingResult.Item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const booking = bookingResult.Item as Booking;

  if (booking.status !== "PENDING_ASSIGNMENT") {
    return NextResponse.json({ error: "status_conflict" }, { status: 409 });
  }

  // 2) Query providers for Wave 1
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
    .filter((p): p is Provider & Record<string, unknown> =>
      typeof p.providerId === "string" && typeof p.whatsappPhone === "string"
    )
    .slice(0, 3);

  const now = new Date().toISOString();
  const deadline = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const location = booking.place || booking.area;
  const payout = formatPayout(booking.payoutCents);

  // 3) Send to each provider and log broadcast
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

  // 4) Write truth-metric event
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

  // 5) Update booking with dispatch metadata
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
      UpdateExpression:
        "SET dispatchStartedAt = :started, assignmentDeadline = :deadline, updatedAt = :now",
      ExpressionAttributeValues: {
        ":started": now,
        ":deadline": deadline,
        ":now": now,
      },
    })
  );

  return NextResponse.json({
    dispatched: true,
    wave: 1,
    providersNotified: providers.length,
  });
}
