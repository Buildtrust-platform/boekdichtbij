/**
 * GET /api/ops/metrics/daily
 *
 * Reads daily metrics items for an area.
 * Token-protected (x-ops-token).
 *
 * Query params:
 *   area (required) - lowercase area code
 *   from (optional) - start date yyyy-mm-dd
 *   to (optional) - end date yyyy-mm-dd
 *   limit (optional) - max items to return (default 30, max 90)
 */

import { NextResponse } from "next/server";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { DailyMetric } from "@/lib/metricsDaily";

const OPS_TOKEN = process.env.OPS_TOKEN;

function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export async function GET(request: Request) {
  // Token check
  const token = request.headers.get("x-ops-token");
  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  // Validate area
  const area = searchParams.get("area")?.toLowerCase().trim();
  if (!area) {
    return NextResponse.json(
      { error: "missing_area", message: "area query param is required" },
      { status: 400 }
    );
  }

  // Parse optional date range
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (from && !isValidDate(from)) {
    return NextResponse.json(
      { error: "invalid_from", message: "from must be yyyy-mm-dd" },
      { status: 400 }
    );
  }
  if (to && !isValidDate(to)) {
    return NextResponse.json(
      { error: "invalid_to", message: "to must be yyyy-mm-dd" },
      { status: 400 }
    );
  }

  // Parse limit
  const limitParam = searchParams.get("limit");
  let limit = 30;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (isNaN(parsed) || parsed < 1) {
      return NextResponse.json(
        { error: "invalid_limit", message: "limit must be a positive integer" },
        { status: 400 }
      );
    }
    limit = Math.min(parsed, 90);
  }

  console.log("[MetricsDaily] Querying:", area, "from:", from, "to:", to, "limit:", limit);

  try {
    // Build query
    const pk = `METRIC#AREA#${area}`;

    let keyCondition: string;
    const exprValues: Record<string, string> = { ":pk": pk };

    if (from && to) {
      // Range query: DATE#from to DATE#to (inclusive)
      keyCondition = "PK = :pk AND SK BETWEEN :skFrom AND :skTo";
      exprValues[":skFrom"] = `DATE#${from}`;
      exprValues[":skTo"] = `DATE#${to}`;
    } else if (from) {
      // From date onwards
      keyCondition = "PK = :pk AND SK >= :skFrom";
      exprValues[":skFrom"] = `DATE#${from}`;
    } else if (to) {
      // Up to date
      keyCondition = "PK = :pk AND SK <= :skTo";
      exprValues[":skTo"] = `DATE#${to}`;
    } else {
      // No date filter, just get by PK
      keyCondition = "PK = :pk";
    }

    const metrics: DailyMetric[] = [];
    let lastKey: Record<string, unknown> | undefined;

    // Paginate until we have enough or no more items
    do {
      const result = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: keyCondition,
          ExpressionAttributeValues: exprValues,
          ScanIndexForward: false, // Newest first (descending SK)
          Limit: limit - metrics.length,
          ExclusiveStartKey: lastKey,
        })
      );

      for (const item of result.Items || []) {
        if (item.type === "METRIC_DAILY") {
          metrics.push(item as DailyMetric);
        }
      }

      lastKey = result.LastEvaluatedKey;
    } while (lastKey && metrics.length < limit);

    console.log("[MetricsDaily] Returned", metrics.length, "items");

    return NextResponse.json({
      area,
      count: metrics.length,
      metrics,
    });
  } catch (err) {
    console.error("[MetricsDaily] Query failed:", err);
    return NextResponse.json(
      { error: "query_failed", message: String(err) },
      { status: 500 }
    );
  }
}
