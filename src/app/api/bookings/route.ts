import { NextResponse } from "next/server";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { ddb, TABLE_NAME } from "@/lib/ddb";

interface BookingDraftInput {
  serviceKey: string;
  serviceName: string;
  durationMin: number;
  priceCents: number;
  payoutCents: number;
  timeWindowLabel: string;
  windowStart: string;
  windowEnd: string;
  address: string;
  postcode: string;
  place: string;
  customerName: string;
  phone: string;
  email: string;
  area: string;
}

const REQUIRED_FIELDS: (keyof BookingDraftInput)[] = [
  "serviceKey",
  "serviceName",
  "durationMin",
  "priceCents",
  "payoutCents",
  "timeWindowLabel",
  "windowStart",
  "windowEnd",
  "address",
  "postcode",
  "place",
  "customerName",
  "phone",
  "email",
  "area",
];

function validateInput(body: unknown): body is BookingDraftInput {
  if (!body || typeof body !== "object") return false;
  const obj = body as Record<string, unknown>;
  for (const field of REQUIRED_FIELDS) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === "") {
      return false;
    }
  }
  if (typeof obj.durationMin !== "number") return false;
  if (typeof obj.priceCents !== "number") return false;
  if (typeof obj.payoutCents !== "number") return false;
  return true;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!validateInput(body)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const bookingId = ulid();
  const now = new Date().toISOString();
  const status = "PENDING_PAYMENT";

  const bookingItem = {
    PK: `BOOKING#${bookingId}`,
    SK: "BOOKING",
    bookingId,
    status,
    serviceKey: body.serviceKey,
    serviceName: body.serviceName,
    durationMin: body.durationMin,
    priceCents: body.priceCents,
    payoutCents: body.payoutCents,
    timeWindowLabel: body.timeWindowLabel,
    windowStart: body.windowStart,
    windowEnd: body.windowEnd,
    address: body.address,
    postcode: body.postcode,
    place: body.place,
    customerName: body.customerName,
    phone: body.phone,
    email: body.email,
    area: body.area,
    createdAt: now,
    updatedAt: now,
    GSI1PK: `AREA#${body.area}#STATUS#${status}`,
    GSI1SK: `CREATED#${now}#BOOKING#${bookingId}`,
  };

  const eventItem = {
    PK: `BOOKING#${bookingId}`,
    SK: `EVENT#${now}#booking_created`,
    type: "EVENT",
    eventName: "booking_created",
    at: now,
  };

  try {
    console.log("[Booking] Creating booking:", bookingId, "Table:", TABLE_NAME);
    const putResult = await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: bookingItem,
      })
    );
    console.log("[Booking] PutCommand result:", JSON.stringify(putResult));

    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: eventItem,
      })
    );

    console.log("[Booking] Created successfully:", bookingId);
    return NextResponse.json({ bookingId }, { status: 201 });
  } catch (error) {
    console.error("DynamoDB error:", error);
    return NextResponse.json({ error: "ddb_error" }, { status: 500 });
  }
}
