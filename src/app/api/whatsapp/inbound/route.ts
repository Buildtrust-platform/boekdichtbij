import { NextResponse } from "next/server";
import {
  GetCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { sendWhatsApp } from "@/lib/sendWhatsApp";

interface InboundPayload {
  from: string;
  body: string;
  bookingId: string;
}

interface Booking {
  bookingId: string;
  status: string;
  area: string;
  createdAt: string;
  assignmentDeadline?: string;
  serviceName: string;
  timeWindowLabel: string;
  address: string;
  postcode: string;
  place: string;
  customerName: string;
  phone: string;
  payoutCents: number;
}

interface Provider {
  providerId: string;
  whatsappPhone: string;
}

function formatPayout(cents: number): string {
  const euros = cents / 100;
  return euros % 1 === 0 ? euros.toString() : euros.toFixed(2);
}

function buildAssignmentDetails(booking: Booking): string {
  const payout = formatPayout(booking.payoutCents);
  return `Boekingsgegevens

Dienst: ${booking.serviceName}
Tijdvak: ${booking.timeWindowLabel}
Adres: ${booking.address}, ${booking.postcode} ${booking.place}
Naam klant: ${booking.customerName}
Telefoon: ${booking.phone}

Uitbetaling: €${payout}`;
}

// MVP fallback: scan for provider by phone since GSI3 may not exist
async function findProviderByPhone(phone: string): Promise<Provider | null> {
  const result = await ddb.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "whatsappPhone = :phone AND begins_with(PK, :prefix)",
      ExpressionAttributeValues: {
        ":phone": phone,
        ":prefix": "PROVIDER#",
      },
      Limit: 100,
    })
  );

  if (!result.Items || result.Items.length === 0) {
    return null;
  }

  const item = result.Items[0];
  return {
    providerId: item.providerId as string,
    whatsappPhone: item.whatsappPhone as string,
  };
}

export async function POST(request: Request) {
  let payload: Partial<InboundPayload>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { from, body, bookingId } = payload;

  if (!from || !body || !bookingId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // Normalize and check for "JA"
  const normalized = body.trim().toUpperCase();
  if (normalized !== "JA") {
    return NextResponse.json({ ignored: true });
  }

  // Find provider by phone
  const provider = await findProviderByPhone(from);
  if (!provider) {
    return NextResponse.json({ error: "provider_not_found" }, { status: 404 });
  }

  // Load booking
  const bookingResult = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
    })
  );

  if (!bookingResult.Item) {
    return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
  }

  const booking = bookingResult.Item as Booking;

  if (booking.status !== "PENDING_ASSIGNMENT") {
    return NextResponse.json({ error: "not_assignable" }, { status: 409 });
  }

  if (booking.assignmentDeadline && new Date() > new Date(booking.assignmentDeadline)) {
    return NextResponse.json({ error: "expired" }, { status: 409 });
  }

  const now = new Date().toISOString();

  // Race-safe assignment
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
        UpdateExpression: `
          SET assignedProviderId = :providerId,
              #status = :assigned,
              acceptedAt = :now,
              updatedAt = :now,
              GSI1PK = :gsi1pk
        `,
        ConditionExpression:
          "#status = :pending AND attribute_not_exists(assignedProviderId)",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":providerId": provider.providerId,
          ":assigned": "ASSIGNED",
          ":pending": "PENDING_ASSIGNMENT",
          ":now": now,
          ":gsi1pk": `AREA#${booking.area}#STATUS#ASSIGNED`,
        },
      })
    );
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      // Someone else won
      await sendWhatsApp(from, "De boeking is inmiddels toegewezen.");
      return NextResponse.json({ won: false, reason: "already_assigned" });
    }
    console.error("DynamoDB error:", error);
    return NextResponse.json({ error: "ddb_error" }, { status: 500 });
  }

  // Write events
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `BOOKING#${bookingId}`,
        SK: `EVENT#${now}#provider_accepted`,
        type: "EVENT",
        eventName: "provider_accepted",
        at: now,
        meta: { providerId: provider.providerId },
      },
    })
  );

  const assignedAt = new Date(Date.now() + 1).toISOString();
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `BOOKING#${bookingId}`,
        SK: `EVENT#${assignedAt}#booking_assigned`,
        type: "EVENT",
        eventName: "booking_assigned",
        at: assignedAt,
        meta: { providerId: provider.providerId },
      },
    })
  );

  // Notify winner
  await sendWhatsApp(from, "Boeking toegewezen.\n\nKlantgegevens volgen.");
  await sendWhatsApp(from, buildAssignmentDetails(booking));

  // Notify losers
  const broadcastResult = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `BOOKING#${bookingId}`,
        ":sk": "BROADCAST#",
      },
    })
  );

  const broadcasts = broadcastResult.Items || [];
  const loserProviderIds = new Set<string>();

  for (const broadcast of broadcasts) {
    const bProviderId = broadcast.providerId as string;
    if (bProviderId && bProviderId !== provider.providerId) {
      loserProviderIds.add(bProviderId);
    }
  }

  // Fetch loser phones and notify
  for (const loserId of loserProviderIds) {
    const loserResult = await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `PROVIDER#${loserId}`, SK: "PROVIDER" },
      })
    );

    if (loserResult.Item && loserResult.Item.whatsappPhone) {
      await sendWhatsApp(
        loserResult.Item.whatsappPhone as string,
        "De boeking is inmiddels toegewezen."
      );
    }
  }

  return NextResponse.json({
    won: true,
    bookingId,
    providerId: provider.providerId,
  });
}
