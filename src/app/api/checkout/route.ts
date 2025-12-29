import { NextResponse } from "next/server";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import Stripe from "stripe";
import { ddb, TABLE_NAME } from "@/lib/ddb";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface CheckoutInput {
  bookingId: string;
}

export async function POST(request: Request) {
  let body: CheckoutInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!body.bookingId || typeof body.bookingId !== "string") {
    return NextResponse.json({ error: "missing_booking_id" }, { status: 400 });
  }

  // Load booking from DynamoDB
  const bookingResult = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `BOOKING#${body.bookingId}`,
        SK: "BOOKING",
      },
    })
  );

  if (!bookingResult.Item) {
    return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
  }

  const booking = bookingResult.Item;

  // Only allow checkout for PENDING_PAYMENT status
  if (booking.status !== "PENDING_PAYMENT") {
    return NextResponse.json({ error: "invalid_booking_status" }, { status: 400 });
  }

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card", "ideal"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: booking.serviceName,
            description: booking.timeWindowLabel,
          },
          unit_amount: booking.priceCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${APP_URL}/rotterdam/ridderkerk/kapper/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/rotterdam/ridderkerk/kapper/cancel`,
    customer_email: booking.email,
    metadata: {
      bookingId: body.bookingId,
    },
  });

  // Update booking with stripeSessionId and GSI3 keys (conditional to prevent double-submit)
  const now = new Date().toISOString();
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `BOOKING#${body.bookingId}`,
          SK: "BOOKING",
        },
        UpdateExpression:
          "SET stripeSessionId = :sessionId, GSI3PK = :gsi3pk, GSI3SK = :gsi3sk, updatedAt = :now",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":sessionId": session.id,
          ":gsi3pk": `STRIPE_SESSION#${session.id}`,
          ":gsi3sk": `BOOKING#${body.bookingId}`,
          ":now": now,
          ":pendingPayment": "PENDING_PAYMENT",
        },
        ConditionExpression:
          "#status = :pendingPayment AND attribute_not_exists(stripeSessionId)",
      })
    );
  } catch (err) {
    if ((err as Error).name === "ConditionalCheckFailedException") {
      console.error("[Checkout] Conflict: booking already has session or invalid status:", body.bookingId);
      return NextResponse.json({ error: "checkout_conflict" }, { status: 409 });
    }
    throw err;
  }

  console.log("[Checkout] Created session:", session.id, "for booking:", body.bookingId);

  return NextResponse.json({ checkoutUrl: session.url });
}
