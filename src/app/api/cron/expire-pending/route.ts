import { NextResponse } from "next/server";
import { QueryCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";

interface RequestBody {
  areas: string[];
  limitPerArea?: number;
  dryRun?: boolean;
}

interface AreaStats {
  scanned: number;
  expired: number;
  skipped_not_due: number;
  skipped_missing_deadline: number;
  conflicts_already_assigned: number;
}

export async function POST(request: Request) {
  const token = request.headers.get("x-ops-token");
  if (!token || token !== process.env.OPS_TOKEN) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { areas, limitPerArea = 25, dryRun = false } = body;

  if (!Array.isArray(areas) || areas.length === 0) {
    return NextResponse.json({ error: "areas_required" }, { status: 400 });
  }

  const now = new Date();
  const nowIso = now.toISOString();

  const totals: AreaStats = {
    scanned: 0,
    expired: 0,
    skipped_not_due: 0,
    skipped_missing_deadline: 0,
    conflicts_already_assigned: 0,
  };

  const byArea: Record<string, AreaStats> = {};

  for (const area of areas) {
    const areaStats: AreaStats = {
      scanned: 0,
      expired: 0,
      skipped_not_due: 0,
      skipped_missing_deadline: 0,
      conflicts_already_assigned: 0,
    };

    const queryResult = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: {
          ":pk": `AREA#${area}#STATUS#PENDING_ASSIGNMENT`,
        },
        Limit: limitPerArea,
      })
    );

    const items = queryResult.Items || [];
    areaStats.scanned = items.length;

    for (const item of items) {
      const bookingId = item.bookingId as string;
      const assignmentDeadline = item.assignmentDeadline as string | undefined;

      if (!assignmentDeadline) {
        areaStats.skipped_missing_deadline++;
        continue;
      }

      const deadline = new Date(assignmentDeadline);
      if (now <= deadline) {
        areaStats.skipped_not_due++;
        continue;
      }

      if (dryRun) {
        areaStats.expired++;
        continue;
      }

      try {
        await ddb.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
            UpdateExpression: `
              SET #status = :unfilled,
                  updatedAt = :now,
                  GSI1PK = :gsi1pk
            `,
            ConditionExpression:
              "#status = :pending AND attribute_not_exists(assignedProviderId)",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: {
              ":unfilled": "UNFILLED",
              ":pending": "PENDING_ASSIGNMENT",
              ":now": nowIso,
              ":gsi1pk": `AREA#${area}#STATUS#UNFILLED`,
            },
          })
        );

        await ddb.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              PK: `BOOKING#${bookingId}`,
              SK: `EVENT#${nowIso}#booking_unfilled`,
              type: "EVENT",
              eventName: "booking_unfilled",
              at: nowIso,
              meta: { via: "sweep" },
            },
          })
        );

        areaStats.expired++;
      } catch (error) {
        if (error instanceof ConditionalCheckFailedException) {
          areaStats.conflicts_already_assigned++;
        } else {
          throw error;
        }
      }
    }

    byArea[area] = areaStats;
    totals.scanned += areaStats.scanned;
    totals.expired += areaStats.expired;
    totals.skipped_not_due += areaStats.skipped_not_due;
    totals.skipped_missing_deadline += areaStats.skipped_missing_deadline;
    totals.conflicts_already_assigned += areaStats.conflicts_already_assigned;
  }

  return NextResponse.json({
    ok: true,
    now: nowIso,
    dryRun,
    totals,
    byArea,
  });
}
