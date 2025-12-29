/**
 * Daily metrics computation for booking KPIs.
 *
 * Uses GSI1 to efficiently count bookings per (area, status, date).
 * No full table scans - queries only needed status partitions.
 */

import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";

const STATUSES = [
  "PENDING_PAYMENT",
  "PENDING_ASSIGNMENT",
  "ASSIGNED",
  "UNFILLED",
  "REFUNDED",
] as const;

type BookingStatus = (typeof STATUSES)[number];

export interface DailyMetric {
  PK: string;
  SK: string;
  type: "METRIC_DAILY";
  area: string;
  date: string;
  totals: {
    totalBookings: number;
    pendingPayment: number;
    pendingAssignment: number;
    assigned: number;
    unfilled: number;
    refunded: number;
  };
  rates: {
    unfilledRate: number;
    assignedRate: number;
  };
  updatedAt: string;
}

/**
 * Count bookings for a specific (area, status, date) using GSI1.
 * Handles pagination if result set is large.
 */
async function countBookingsForStatus(
  area: string,
  status: BookingStatus,
  date: string
): Promise<number> {
  let count = 0;
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI1",
        KeyConditionExpression:
          "GSI1PK = :pk AND begins_with(GSI1SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": `AREA#${area}#STATUS#${status}`,
          ":prefix": `CREATED#${date}`,
        },
        Select: "COUNT",
        ExclusiveStartKey: lastKey,
      })
    );

    count += result.Count || 0;
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return count;
}

/**
 * Compute daily metrics for a given area and date.
 * Queries each status partition separately to avoid scans.
 *
 * @param area - Lowercase area code (e.g., "ridderkerk")
 * @param date - Date in yyyy-mm-dd format
 */
export async function computeDailyMetrics(
  area: string,
  date: string
): Promise<DailyMetric> {
  // Query counts for each status in parallel
  const [pendingPayment, pendingAssignment, assigned, unfilled, refunded] =
    await Promise.all([
      countBookingsForStatus(area, "PENDING_PAYMENT", date),
      countBookingsForStatus(area, "PENDING_ASSIGNMENT", date),
      countBookingsForStatus(area, "ASSIGNED", date),
      countBookingsForStatus(area, "UNFILLED", date),
      countBookingsForStatus(area, "REFUNDED", date),
    ]);

  const totalBookings =
    pendingPayment + pendingAssignment + assigned + unfilled + refunded;

  // Compute rates safely (avoid divide-by-zero)
  const unfilledRate = totalBookings > 0 ? unfilled / totalBookings : 0;
  const assignedRate = totalBookings > 0 ? assigned / totalBookings : 0;

  const metric: DailyMetric = {
    PK: `METRIC#AREA#${area}`,
    SK: `DATE#${date}`,
    type: "METRIC_DAILY",
    area,
    date,
    totals: {
      totalBookings,
      pendingPayment,
      pendingAssignment,
      assigned,
      unfilled,
      refunded,
    },
    rates: {
      unfilledRate: Math.round(unfilledRate * 10000) / 10000, // 4 decimal places
      assignedRate: Math.round(assignedRate * 10000) / 10000,
    },
    updatedAt: new Date().toISOString(),
  };

  return metric;
}
