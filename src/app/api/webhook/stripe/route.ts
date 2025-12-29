import { NextResponse } from "next/server";
import { QueryCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import Stripe from "stripe";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { dispatchWave1 } from "@/lib/dispatchWave1";
import { scheduleAssignmentDeadline, scheduleWave2Dispatch } from "@/lib/scheduler";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

// Deadline in minutes (15 minutes default)
const ASSIGNMENT_DEADLINE_MINUTES = 15;

// Wave 2 escalation delay in minutes (5 minutes after payment)
const WAVE2_DELAY_MINUTES = 5;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error("[Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  // After signature verification, always return 200 to prevent retry storms
  console.log("[Webhook] Received event:", event.type, event.id);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const stripeSessionId = session.id;

    // Query DynamoDB via GSI3 to find the booking
    const queryResult = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI3",
        KeyConditionExpression: "GSI3PK = :pk",
        ExpressionAttributeValues: {
          ":pk": `STRIPE_SESSION#${stripeSessionId}`,
        },
        Limit: 1,
      })
    );

    if (!queryResult.Items || queryResult.Items.length === 0) {
      // Log error but return 200 to prevent Stripe retries
      console.error("[Webhook] Booking not found for session:", stripeSessionId);
      return NextResponse.json({ received: true });
    }

    const booking = queryResult.Items[0];
    const bookingId = booking.bookingId as string;
    const now = new Date();
    const nowIso = now.toISOString();
    const newStatus = "PENDING_ASSIGNMENT";

    // Calculate assignment deadline
    const deadlineDate = new Date(now.getTime() + ASSIGNMENT_DEADLINE_MINUTES * 60 * 1000);
    const assignmentDeadline = deadlineDate.toISOString();
    const assignmentDeadlineEpoch = Math.floor(deadlineDate.getTime() / 1000);

    // Update booking status with deadline fields (conditional to ensure idempotency)
    try {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `BOOKING#${bookingId}`,
            SK: "BOOKING",
          },
          UpdateExpression: `
            SET #status = :newStatus,
                paidAt = :now,
                updatedAt = :now,
                assignmentDeadline = :deadline,
                assignmentDeadlineEpoch = :deadlineEpoch,
                GSI1PK = :gsi1pk,
                GSI1SK = :gsi1sk
          `,
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":newStatus": newStatus,
            ":now": nowIso,
            ":deadline": assignmentDeadline,
            ":deadlineEpoch": assignmentDeadlineEpoch,
            ":gsi1pk": `AREA#${booking.area}#STATUS#${newStatus}`,
            ":gsi1sk": `CREATED#${booking.createdAt}#BOOKING#${bookingId}`,
            ":oldStatus": "PENDING_PAYMENT",
          },
          ConditionExpression: "#status = :oldStatus",
        })
      );

      // Write payment_confirmed event (stable SK for idempotency)
      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `BOOKING#${bookingId}`,
            SK: "EVENT#payment_confirmed",
            type: "EVENT",
            eventName: "payment_confirmed",
            at: nowIso,
            stripeSessionId,
            stripePaymentIntentId: session.payment_intent,
          },
        })
      );

      console.log("[Webhook] Payment confirmed for booking:", bookingId, "deadline:", assignmentDeadline);

      // Schedule deadline enforcement (fire-and-forget)
      scheduleAssignmentDeadline(bookingId, assignmentDeadline).catch((err) => {
        console.error("[Webhook] Failed to schedule deadline (non-fatal):", bookingId, err);
      });

      // Schedule Wave 2 dispatch at now + 5 minutes (fire-and-forget)
      const wave2Date = new Date(now.getTime() + WAVE2_DELAY_MINUTES * 60 * 1000);
      const wave2At = wave2Date.toISOString();
      scheduleWave2Dispatch(bookingId, wave2At).catch((err) => {
        console.error("[Webhook] Failed to schedule Wave 2 (non-fatal):", bookingId, err);
      });

      console.log("[Webhook] Scheduled Wave 2 for:", bookingId, "at:", wave2At);

      // Trigger Wave 1 dispatch (fire-and-forget, errors logged but don't fail webhook)
      try {
        const dispatchResult = await dispatchWave1(bookingId);
        console.log("[Webhook] Dispatch result:", bookingId, dispatchResult);
      } catch (dispatchErr) {
        console.error("[Webhook] Dispatch failed (non-fatal):", bookingId, dispatchErr);
      }
    } catch (err) {
      if ((err as Error).name === "ConditionalCheckFailedException") {
        // Already processed or status changed - this is fine, just log
        console.log("[Webhook] Booking already processed or status changed:", bookingId);
      } else {
        // Log unexpected error but still return 200
        console.error("[Webhook] Error updating booking:", bookingId, err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
