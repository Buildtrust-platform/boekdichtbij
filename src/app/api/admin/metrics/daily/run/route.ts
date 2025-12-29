/**
 * POST /api/admin/metrics/daily/run
 *
 * Computes and stores daily metrics for a given area.
 * Token-protected (x-ops-token).
 *
 * CRON DEPLOYMENT NOTE:
 * This endpoint can be triggered daily by AWS EventBridge Scheduler.
 * Example schedule: rate(1 day) at 01:00 UTC
 * Target: POST to this endpoint with { "area": "ridderkerk" }
 * Include x-ops-token header in the EventBridge HTTP target config.
 */

import { NextResponse } from "next/server";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { computeDailyMetrics } from "@/lib/metricsDaily";

const OPS_TOKEN = process.env.OPS_TOKEN;

/**
 * Get today's date in yyyy-mm-dd format (Europe/Amsterdam timezone).
 */
function getTodayDate(): string {
  const now = new Date();
  // Use Intl to get Amsterdam date parts
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now); // Returns yyyy-mm-dd format
}

/**
 * Validate date format (yyyy-mm-dd).
 */
function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export async function POST(request: Request) {
  // Token check
  const token = request.headers.get("x-ops-token");
  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { area?: string; date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { area, date } = body;

  // Validate area
  if (!area || typeof area !== "string") {
    return NextResponse.json(
      { error: "missing_area", message: "area is required" },
      { status: 400 }
    );
  }

  const normalizedArea = area.toLowerCase().trim();
  if (normalizedArea.length === 0) {
    return NextResponse.json(
      { error: "invalid_area", message: "area cannot be empty" },
      { status: 400 }
    );
  }

  // Validate/default date
  let targetDate: string;
  if (date) {
    if (!isValidDate(date)) {
      return NextResponse.json(
        { error: "invalid_date", message: "date must be yyyy-mm-dd format" },
        { status: 400 }
      );
    }
    targetDate = date;
  } else {
    targetDate = getTodayDate();
  }

  console.log("[MetricsRun] Computing metrics for:", normalizedArea, targetDate);

  try {
    // Compute metrics
    const metric = await computeDailyMetrics(normalizedArea, targetDate);

    // Write to DynamoDB (upsert)
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: metric,
      })
    );

    console.log("[MetricsRun] Stored metrics:", metric.PK, metric.SK);

    return NextResponse.json(metric);
  } catch (err) {
    console.error("[MetricsRun] Failed:", err);
    return NextResponse.json(
      { error: "computation_failed", message: String(err) },
      { status: 500 }
    );
  }
}
