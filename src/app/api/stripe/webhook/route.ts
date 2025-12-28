import { NextResponse } from "next/server";
import { GetCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { getStripe } from "@/lib/stripe";
import { dispatchWave1 } from "@/lib/dispatchWave1";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Stripe Webhook] Signature verification failed:", message);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      console.log(`[Stripe Webhook] Session ${session.id} not paid yet, payment_status: ${session.payment_status}`);
      return NextResponse.json({ received: true });
    }

    const bookingId = session.metadata?.bookingId || session.client_reference_id;

    if (!bookingId) {
      console.error("[Stripe Webhook] No bookingId in session metadata or client_reference_id");
      return NextResponse.json({ received: true });
    }

    await processPaymentConfirmation(bookingId, event.type);
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const bookingId = paymentIntent.metadata?.bookingId;

    if (!bookingId) {
      console.log("[Stripe Webhook] No bookingId in payment_intent metadata, skipping");
      return NextResponse.json({ received: true });
    }

    await processPaymentConfirmation(bookingId, event.type);
  }

  return NextResponse.json({ received: true });
}

async function processPaymentConfirmation(bookingId: string, eventType: string): Promise<void> {
  const now = new Date().toISOString();

  // Get booking to retrieve area and createdAt for GSI update
  const getResult = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
      ProjectionExpression: "area, createdAt, #status",
      ExpressionAttributeNames: { "#status": "status" },
    })
  );

  if (!getResult.Item) {
    console.log(`[Stripe Webhook] Booking ${bookingId} not found`);
    return;
  }

  const { area, createdAt, status } = getResult.Item;

  // Already processed - idempotent return
  if (status !== "PENDING_PAYMENT") {
    console.log(`[Stripe Webhook] Booking ${bookingId} already processed (status: ${status})`);
    return;
  }

  try {
    // Conditional update: only transition if status == PENDING_PAYMENT
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
        UpdateExpression:
          "SET #status = :newStatus, paymentConfirmedAt = :now, stripePaymentStatus = :paid, updatedAt = :now, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk",
        ConditionExpression: "#status = :pendingPayment",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":newStatus": "PENDING_ASSIGNMENT",
          ":pendingPayment": "PENDING_PAYMENT",
          ":paid": "PAID",
          ":now": now,
          ":gsi1pk": `AREA#${area || "ridderkerk"}#STATUS#PENDING_ASSIGNMENT`,
          ":gsi1sk": `CREATED#${createdAt}#BOOKING#${bookingId}`,
        },
      })
    );

    console.log(`[Stripe Webhook] Booking ${bookingId} transitioned to PENDING_ASSIGNMENT`);

    // Write payment_confirmed event only after successful transition
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `BOOKING#${bookingId}`,
          SK: `EVENT#${now}#payment_confirmed`,
          type: "EVENT",
          eventName: "payment_confirmed",
          at: now,
          meta: { source: "stripe_webhook", eventType },
        },
      })
    );

    // Dispatch Wave 1 - function handles its own idempotency via conditional update
    const dispatchResult = await dispatchWave1(bookingId);
    console.log(`[Stripe Webhook] Dispatch result for ${bookingId}:`, dispatchResult);
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      console.log(`[Stripe Webhook] Booking ${bookingId} already processed (conditional check failed)`);
      return;
    }
    console.error(`[Stripe Webhook] Error processing ${bookingId}:`, error);
    throw error;
  }
}
