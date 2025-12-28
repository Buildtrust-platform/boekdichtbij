import { NextResponse } from "next/server";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { getStripe } from "@/lib/stripe";

const PLATFORM_FEE_CENTS = 200;

interface CheckoutInput {
  bookingId?: string;
}

export async function POST(request: Request) {
  let body: CheckoutInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { bookingId } = body;
  if (!bookingId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const bookingResult = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
    })
  );

  if (!bookingResult.Item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const booking = bookingResult.Item;

  if (booking.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ error: "status_conflict" }, { status: 409 });
  }

  const totalCents =
    booking.totalCents ??
    (booking.payoutCents || 0) + (booking.platformFeeCents ?? PLATFORM_FEE_CENTS);

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `${booking.serviceName} - ${booking.area}`,
          },
          unit_amount: totalCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/rotterdam/ridderkerk/kapper/success?bookingId=${bookingId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/rotterdam/ridderkerk/kapper?cancelled=1`,
    metadata: { bookingId },
    client_reference_id: bookingId,
  });

  const now = new Date().toISOString();

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
      UpdateExpression:
        "SET stripeCheckoutSessionId = :sessionId, stripePaymentStatus = :status, updatedAt = :now",
      ExpressionAttributeValues: {
        ":sessionId": session.id,
        ":status": "CREATED",
        ":now": now,
      },
    })
  );

  return NextResponse.json({ url: session.url });
}
