import {
  SchedulerClient,
  CreateScheduleCommand,
  DeleteScheduleCommand,
  ResourceNotFoundException,
  ConflictException,
} from "@aws-sdk/client-scheduler";

const SCHEDULER_ROLE_ARN = process.env.SCHEDULER_ROLE_ARN;
const DEADLINE_LAMBDA_ARN = process.env.DEADLINE_LAMBDA_ARN;
const WAVE2_LAMBDA_ARN = process.env.WAVE2_LAMBDA_ARN;
const AWS_REGION = process.env.AWS_REGION || "eu-central-1";

const schedulerClient = new SchedulerClient({ region: AWS_REGION });

/**
 * Convert ISO date string to EventBridge Scheduler at() expression.
 * EventBridge Scheduler requires format: at(yyyy-mm-ddThh:mm:ss)
 */
function toSchedulerAtExpression(isoUtc: string): string {
  // Parse and format to required format (remove milliseconds and Z)
  const date = new Date(isoUtc);
  const formatted = date.toISOString().slice(0, 19); // yyyy-mm-ddThh:mm:ss
  return `at(${formatted})`;
}

/**
 * Generate deterministic schedule name for a booking deadline.
 * Must be deterministic so we can delete by bookingId.
 */
function generateDeadlineScheduleName(bookingId: string): string {
  return `boekdichtbij-deadline-${bookingId}`;
}

/**
 * Generate deterministic schedule name for Wave 2 dispatch.
 * Must be deterministic so we can delete by bookingId.
 */
function generateWave2ScheduleName(bookingId: string): string {
  return `boekdichtbij-wave2-${bookingId}`;
}

export interface ScheduleResult {
  scheduleName: string;
  success: boolean;
  error?: string;
}

/**
 * Schedule a one-time Lambda invocation for the assignment deadline.
 * If SCHEDULER_ROLE_ARN or DEADLINE_LAMBDA_ARN are not configured,
 * logs a warning and returns success (for local dev).
 */
export async function scheduleAssignmentDeadline(
  bookingId: string,
  runAtIsoUtc: string
): Promise<ScheduleResult> {
  const scheduleName = generateDeadlineScheduleName(bookingId);

  if (!SCHEDULER_ROLE_ARN || !DEADLINE_LAMBDA_ARN) {
    console.warn(
      "[Scheduler] SCHEDULER_ROLE_ARN or DEADLINE_LAMBDA_ARN not configured. Skipping schedule creation."
    );
    return { scheduleName, success: true };
  }

  try {
    await schedulerClient.send(
      new CreateScheduleCommand({
        Name: scheduleName,
        GroupName: "default",
        ScheduleExpression: toSchedulerAtExpression(runAtIsoUtc),
        ScheduleExpressionTimezone: "UTC",
        FlexibleTimeWindow: {
          Mode: "OFF",
        },
        Target: {
          Arn: DEADLINE_LAMBDA_ARN,
          RoleArn: SCHEDULER_ROLE_ARN,
          Input: JSON.stringify({ bookingId }),
        },
        // One-time schedule, delete after completion
        ActionAfterCompletion: "DELETE",
      })
    );

    console.log(
      "[Scheduler] Created schedule:",
      scheduleName,
      "for booking:",
      bookingId,
      "at:",
      runAtIsoUtc
    );

    return { scheduleName, success: true };
  } catch (error) {
    if (error instanceof ConflictException) {
      // Schedule already exists - treat as success (idempotent)
      console.log("[Scheduler] Schedule already exists:", scheduleName);
      return { scheduleName, success: true };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Scheduler] Failed to create schedule:", scheduleName, errorMessage);
    return { scheduleName, success: false, error: errorMessage };
  }
}

/**
 * Delete a schedule by name (for cleanup if needed).
 */
export async function deleteSchedule(scheduleName: string): Promise<boolean> {
  if (!SCHEDULER_ROLE_ARN || !DEADLINE_LAMBDA_ARN) {
    console.log("[Scheduler] Scheduler not configured, skipping delete");
    return true;
  }

  try {
    await schedulerClient.send(
      new DeleteScheduleCommand({
        Name: scheduleName,
        GroupName: "default",
      })
    );
    console.log("[Scheduler] Deleted schedule:", scheduleName);
    return true;
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      // Already deleted or doesn't exist - treat as success (idempotent)
      console.log("[Scheduler] Schedule not found (already deleted):", scheduleName);
      return true;
    }
    console.error("[Scheduler] Failed to delete schedule:", scheduleName, error);
    return false;
  }
}

/**
 * Delete the assignment deadline schedule for a booking.
 * Uses deterministic schedule name derived from bookingId.
 * Idempotent: if schedule doesn't exist, returns successfully.
 */
export async function deleteAssignmentDeadlineSchedule(bookingId: string): Promise<void> {
  const scheduleName = generateDeadlineScheduleName(bookingId);
  await deleteSchedule(scheduleName);
}

/**
 * Schedule Wave 2 dispatch for a booking.
 * Typically called 5 minutes after PENDING_ASSIGNMENT to escalate to more providers.
 */
export async function scheduleWave2Dispatch(
  bookingId: string,
  runAtIsoUtc: string
): Promise<ScheduleResult> {
  const scheduleName = generateWave2ScheduleName(bookingId);

  if (!SCHEDULER_ROLE_ARN || !WAVE2_LAMBDA_ARN) {
    console.warn(
      "[Scheduler] SCHEDULER_ROLE_ARN or WAVE2_LAMBDA_ARN not configured. Skipping Wave 2 schedule."
    );
    return { scheduleName, success: true };
  }

  try {
    await schedulerClient.send(
      new CreateScheduleCommand({
        Name: scheduleName,
        GroupName: "default",
        ScheduleExpression: toSchedulerAtExpression(runAtIsoUtc),
        ScheduleExpressionTimezone: "UTC",
        FlexibleTimeWindow: {
          Mode: "OFF",
        },
        Target: {
          Arn: WAVE2_LAMBDA_ARN,
          RoleArn: SCHEDULER_ROLE_ARN,
          Input: JSON.stringify({ bookingId }),
        },
        ActionAfterCompletion: "DELETE",
      })
    );

    console.log(
      "[Scheduler] Created Wave 2 schedule:",
      scheduleName,
      "for booking:",
      bookingId,
      "at:",
      runAtIsoUtc
    );

    return { scheduleName, success: true };
  } catch (error) {
    if (error instanceof ConflictException) {
      console.log("[Scheduler] Wave 2 schedule already exists:", scheduleName);
      return { scheduleName, success: true };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Scheduler] Failed to create Wave 2 schedule:", scheduleName, errorMessage);
    return { scheduleName, success: false, error: errorMessage };
  }
}

/**
 * Delete the Wave 2 dispatch schedule for a booking.
 * Called when a provider accepts (booking becomes ASSIGNED).
 * Idempotent: if schedule doesn't exist, returns successfully.
 */
export async function deleteWave2Schedule(bookingId: string): Promise<void> {
  const scheduleName = generateWave2ScheduleName(bookingId);
  await deleteSchedule(scheduleName);
}
