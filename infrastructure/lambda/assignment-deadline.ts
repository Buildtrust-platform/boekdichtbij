/**
 * Lambda handler for assignment deadline enforcement.
 * Invoked by EventBridge Scheduler 15 minutes after payment.
 *
 * If booking is still PENDING_ASSIGNMENT:
 * 1. Mark as UNFILLED (conditional, race-safe)
 * 2. Set refundState = REFUND_PENDING (recovery marker)
 * 3. Issue Stripe refund (idempotent via idempotencyKey)
 * 4. Mark as REFUNDED
 * 5. Write event items (non-blocking)
 *
 * IDEMPOTENCY GUARANTEES:
 * - Multiple invocations will not create duplicate refunds (Stripe idempotencyKey)
 * - State transitions are guarded by conditional expressions
 * - Recovery markers allow detecting and healing stuck bookings
 *
 * RECOVERY SCENARIOS:
 * - If Lambda fails after UNFILLED but before refund: refundState absent, can retry
 * - If Lambda fails after refund created but before DB update: refundState=REFUND_PENDING,
 *   next invocation will sync from Stripe idempotency response
 * - If booking already REFUNDED: exits immediately
 */

import {
  DynamoDBClient,
  ConditionalCheckFailedException,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  SchedulerClient,
  DeleteScheduleCommand,
  ResourceNotFoundException,
} from "@aws-sdk/client-scheduler";
import Stripe from "stripe";

// Environment variables
const TABLE_NAME = process.env.DDB_TABLE_NAME!;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const AWS_REGION = process.env.AWS_REGION || "eu-central-1";

// Initialize clients
const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
const ddb = DynamoDBDocumentClient.from(dynamoClient);
const stripe = new Stripe(STRIPE_SECRET_KEY);
const schedulerClient = new SchedulerClient({ region: AWS_REGION });

interface LambdaEvent {
  bookingId: string;
}

interface Booking {
  bookingId: string;
  status: string;
  area: string;
  createdAt: string;
  assignmentDeadline?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  assignedProviderId?: string;
  refundId?: string;
  refundState?: string;
}

/**
 * Write an event item to DynamoDB. Failures are logged but do not throw.
 */
async function writeEvent(
  bookingId: string,
  eventName: string,
  meta: Record<string, unknown>
): Promise<void> {
  const now = new Date().toISOString();
  try {
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `BOOKING#${bookingId}`,
          SK: `EVENT#${now}#${eventName}`,
          type: "EVENT",
          eventName,
          at: now,
          meta,
        },
      })
    );
  } catch (err) {
    console.error(`[Deadline] Failed to write ${eventName} event (non-fatal):`, err);
  }
}

/**
 * Delete Wave 2 schedule (fire-and-forget).
 * Called when booking becomes REFUNDED to prevent unnecessary Wave 2 dispatch.
 */
async function deleteWave2Schedule(bookingId: string): Promise<void> {
  const scheduleName = `boekdichtbij-wave2-${bookingId}`;
  try {
    await schedulerClient.send(
      new DeleteScheduleCommand({
        Name: scheduleName,
        GroupName: "default",
      })
    );
    console.log("[Deadline] Deleted Wave 2 schedule:", scheduleName);
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      // Already deleted or doesn't exist - this is fine
      console.log("[Deadline] Wave 2 schedule not found (already deleted):", scheduleName);
    } else {
      console.error("[Deadline] Failed to delete Wave 2 schedule (non-fatal):", scheduleName, error);
    }
  }
}

/**
 * Check if a Stripe error indicates the refund already exists or was replayed.
 */
function isAlreadyRefundedError(error: unknown): boolean {
  if (error instanceof Stripe.errors.StripeError) {
    // "charge_already_refunded" or idempotency replay returns the original response
    if (error.code === "charge_already_refunded") {
      return true;
    }
    // Idempotency key replay returns the cached response, not an error
    // But if there's a different payment_intent, Stripe throws idempotency_key_in_use
  }
  return false;
}

export async function handler(event: LambdaEvent): Promise<{ statusCode: number; body: string }> {
  const { bookingId } = event;

  if (!bookingId) {
    console.error("[Deadline] Missing bookingId in event");
    return { statusCode: 400, body: "Missing bookingId" };
  }

  console.log("[Deadline] Processing booking:", bookingId);

  // ============================================================
  // STEP 0: Load booking and check early exit conditions
  // ============================================================
  let booking: Booking;
  try {
    const bookingResult = await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
      })
    );

    if (!bookingResult.Item) {
      console.log("[Deadline] Booking not found:", bookingId);
      return { statusCode: 200, body: "Booking not found" };
    }

    booking = bookingResult.Item as Booking;
  } catch (err) {
    console.error("[Deadline] Failed to load booking:", bookingId, err);
    return { statusCode: 200, body: "Failed to load booking" };
  }

  // Early exit: already assigned
  if (booking.status === "ASSIGNED" || booking.assignedProviderId) {
    console.log("[Deadline] Booking already assigned:", bookingId);
    return { statusCode: 200, body: "Already assigned" };
  }

  // Early exit: already refunded (check both status and refundId)
  if (booking.status === "REFUNDED" || booking.refundId) {
    console.log("[Deadline] Booking already refunded:", bookingId, booking.refundId);
    return { statusCode: 200, body: "Already refunded" };
  }

  // Early exit: not in PENDING_ASSIGNMENT or UNFILLED state
  // (UNFILLED with refundState=REFUND_PENDING means we need to continue refund process)
  const canProcess =
    booking.status === "PENDING_ASSIGNMENT" ||
    (booking.status === "UNFILLED" && booking.refundState === "REFUND_PENDING") ||
    (booking.status === "UNFILLED" && !booking.refundState);

  if (!canProcess) {
    console.log("[Deadline] Booking in unexpected state:", bookingId, booking.status);
    return { statusCode: 200, body: `Unexpected status: ${booking.status}` };
  }

  // Early exit: deadline not yet reached (safety check, only for PENDING_ASSIGNMENT)
  if (booking.status === "PENDING_ASSIGNMENT" && booking.assignmentDeadline) {
    const deadline = new Date(booking.assignmentDeadline);
    const now = new Date();
    if (now < deadline) {
      console.log("[Deadline] Deadline not yet reached:", bookingId, booking.assignmentDeadline);
      return { statusCode: 200, body: "Deadline not reached" };
    }
  }

  const nowIso = new Date().toISOString();

  // ============================================================
  // STEP 1: Transition to UNFILLED (if still PENDING_ASSIGNMENT)
  // ============================================================
  if (booking.status === "PENDING_ASSIGNMENT") {
    try {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
          UpdateExpression: `
            SET #status = :unfilled,
                unfilledAt = :now,
                updatedAt = :now,
                GSI1PK = :gsi1pk,
                GSI1SK = :gsi1sk
          `,
          ConditionExpression:
            "#status = :pending AND attribute_not_exists(assignedProviderId)",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":unfilled": "UNFILLED",
            ":pending": "PENDING_ASSIGNMENT",
            ":now": nowIso,
            ":gsi1pk": `AREA#${booking.area}#STATUS#UNFILLED`,
            ":gsi1sk": `CREATED#${booking.createdAt}#BOOKING#${bookingId}`,
          },
        })
      );

      console.log("[Deadline] Marked as UNFILLED:", bookingId);

      // Write event (non-blocking)
      await writeEvent(bookingId, "booking_unfilled", { reason: "deadline_expired" });

      // Update local state
      booking.status = "UNFILLED";
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        // Reload booking to check current state
        console.log("[Deadline] UNFILLED transition failed, reloading booking:", bookingId);
        const reloadResult = await ddb.send(
          new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
          })
        );

        if (!reloadResult.Item) {
          return { statusCode: 200, body: "Booking disappeared" };
        }

        const reloaded = reloadResult.Item as Booking;

        // If now assigned or refunded, exit success
        if (reloaded.status === "ASSIGNED" || reloaded.assignedProviderId) {
          console.log("[Deadline] Booking was assigned during processing:", bookingId);
          return { statusCode: 200, body: "Assigned during processing" };
        }
        if (reloaded.status === "REFUNDED" || reloaded.refundId) {
          console.log("[Deadline] Booking was refunded during processing:", bookingId);
          return { statusCode: 200, body: "Refunded during processing" };
        }

        // If now UNFILLED, continue with refund
        if (reloaded.status === "UNFILLED") {
          booking = reloaded;
        } else {
          console.log("[Deadline] Unexpected state after reload:", bookingId, reloaded.status);
          return { statusCode: 200, body: `Unexpected state: ${reloaded.status}` };
        }
      } else {
        console.error("[Deadline] Failed to mark as UNFILLED:", bookingId, error);
        await writeEvent(bookingId, "unfilled_transition_failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        return { statusCode: 200, body: "UNFILLED transition failed" };
      }
    }
  }

  // ============================================================
  // STEP 2: Obtain payment intent ID
  // ============================================================
  let paymentIntentId: string | null = booking.stripePaymentIntentId || null;

  if (!paymentIntentId) {
    if (!booking.stripeSessionId) {
      console.error("[Deadline] No stripeSessionId for booking:", bookingId);
      await writeEvent(bookingId, "refund_skipped", { reason: "no_stripe_session" });
      return { statusCode: 200, body: "No Stripe session" };
    }

    try {
      const session = await stripe.checkout.sessions.retrieve(booking.stripeSessionId);
      paymentIntentId = session.payment_intent as string | null;

      if (!paymentIntentId) {
        console.error("[Deadline] No payment_intent in session:", booking.stripeSessionId);
        await writeEvent(bookingId, "refund_skipped", { reason: "no_payment_intent" });
        return { statusCode: 200, body: "No payment intent" };
      }

      console.log("[Deadline] Found payment intent:", paymentIntentId);
    } catch (stripeError) {
      console.error("[Deadline] Failed to retrieve Stripe session:", stripeError);
      await writeEvent(bookingId, "stripe_session_retrieval_failed", {
        stripeSessionId: booking.stripeSessionId,
        error: stripeError instanceof Error ? stripeError.message : String(stripeError),
      });
      return { statusCode: 200, body: "Stripe session retrieval failed" };
    }
  }

  // ============================================================
  // STEP 3: Set REFUND_PENDING marker (recovery marker)
  // ============================================================
  const refundAttemptedAt = new Date().toISOString();

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
        UpdateExpression: `
          SET refundState = :pending,
              refundAttemptedAt = :attemptedAt,
              stripePaymentIntentId = :paymentIntentId,
              updatedAt = :attemptedAt
        `,
        ConditionExpression:
          "attribute_not_exists(refundState) OR refundState <> :refunded",
        ExpressionAttributeValues: {
          ":pending": "REFUND_PENDING",
          ":refunded": "REFUNDED",
          ":attemptedAt": refundAttemptedAt,
          ":paymentIntentId": paymentIntentId,
        },
      })
    );

    console.log("[Deadline] Set REFUND_PENDING marker:", bookingId);
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      // Already refunded, exit success
      console.log("[Deadline] refundState already REFUNDED:", bookingId);
      return { statusCode: 200, body: "Already refunded" };
    }
    console.error("[Deadline] Failed to set REFUND_PENDING:", bookingId, error);
    // Continue anyway - the marker is for recovery, not critical path
  }

  // ============================================================
  // STEP 4: Create Stripe refund (idempotent)
  // ============================================================
  const idempotencyKey = `refund:${bookingId}`;
  let refundId: string;
  let refundAmount: number;

  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        reason: "requested_by_customer",
        metadata: {
          bookingId,
          reason: "deadline_expired",
        },
      },
      {
        idempotencyKey,
      }
    );

    refundId = refund.id;
    refundAmount = refund.amount;
    console.log("[Deadline] Refund created/retrieved:", refundId, "amount:", refundAmount);
  } catch (refundError) {
    // Check if this is an "already refunded" error
    if (isAlreadyRefundedError(refundError)) {
      console.log("[Deadline] Charge already refunded, fetching existing refund:", bookingId);

      // Fetch existing refunds for this payment intent
      try {
        const refunds = await stripe.refunds.list({
          payment_intent: paymentIntentId,
          limit: 1,
        });

        if (refunds.data.length > 0) {
          refundId = refunds.data[0].id;
          refundAmount = refunds.data[0].amount;
          console.log("[Deadline] Found existing refund:", refundId);
        } else {
          console.error("[Deadline] No refunds found for payment intent:", paymentIntentId);
          await writeEvent(bookingId, "refund_sync_failed", {
            paymentIntentId,
            reason: "no_refunds_found",
          });
          return { statusCode: 200, body: "Refund sync failed" };
        }
      } catch (listError) {
        console.error("[Deadline] Failed to list refunds:", listError);
        await writeEvent(bookingId, "refund_list_failed", {
          paymentIntentId,
          error: listError instanceof Error ? listError.message : String(listError),
        });
        return { statusCode: 200, body: "Failed to list refunds" };
      }
    } else {
      console.error("[Deadline] Failed to create refund:", refundError);
      await writeEvent(bookingId, "refund_failed", {
        paymentIntentId,
        idempotencyKey,
        error: refundError instanceof Error ? refundError.message : String(refundError),
      });
      return { statusCode: 200, body: "Refund failed" };
    }
  }

  // ============================================================
  // STEP 5: Update booking to REFUNDED (with guards)
  // ============================================================
  const refundedAt = new Date().toISOString();

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
        UpdateExpression: `
          SET #status = :refunded,
              refundedAt = :refundedAt,
              refundId = :refundId,
              refundState = :refundState,
              updatedAt = :refundedAt,
              GSI1PK = :gsi1pk,
              GSI1SK = :gsi1sk
        `,
        ConditionExpression:
          "#status = :unfilled OR refundState = :pendingState",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":refunded": "REFUNDED",
          ":refundedAt": refundedAt,
          ":refundId": refundId,
          ":refundState": "REFUNDED",
          ":unfilled": "UNFILLED",
          ":pendingState": "REFUND_PENDING",
          ":gsi1pk": `AREA#${booking.area}#STATUS#REFUNDED`,
          ":gsi1sk": `CREATED#${booking.createdAt}#BOOKING#${bookingId}`,
        },
      })
    );

    console.log("[Deadline] Marked as REFUNDED:", bookingId, "refundId:", refundId);
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      // Check if already refunded (idempotent success)
      const checkResult = await ddb.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
        })
      );

      if (checkResult.Item?.status === "REFUNDED") {
        console.log("[Deadline] Booking already REFUNDED (race):", bookingId);
        return { statusCode: 200, body: "Already refunded" };
      }

      console.error("[Deadline] REFUNDED transition failed unexpectedly:", bookingId, checkResult.Item?.status);
    } else {
      console.error("[Deadline] Failed to mark as REFUNDED:", bookingId, error);
    }

    // Write recovery marker for manual investigation
    await writeEvent(bookingId, "refunded_transition_failed", {
      refundId,
      paymentIntentId,
      error: error instanceof Error ? error.message : String(error),
    });

    return { statusCode: 200, body: "REFUNDED transition failed" };
  }

  // ============================================================
  // STEP 6: Write refund_issued event (non-blocking)
  // ============================================================
  await writeEvent(bookingId, "refund_issued", {
    refundId,
    paymentIntentId,
    amountCents: refundAmount,
  });

  // ============================================================
  // STEP 7: Delete Wave 2 schedule (fire-and-forget)
  // ============================================================
  // No need to send Wave 2 if booking is already refunded
  void deleteWave2Schedule(bookingId);

  console.log("[Deadline] Completed processing for booking:", bookingId);

  return {
    statusCode: 200,
    body: JSON.stringify({
      bookingId,
      status: "REFUNDED",
      refundId,
    }),
  };
}
