import { NextResponse } from "next/server";
import { QueryCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";

const OPS_TOKEN = process.env.OPS_TOKEN;
const DEFAULT_AREAS = ["ridderkerk", "barendrecht", "rotterdam_zuid"];
const DEFAULT_LIMIT = 50;
const DEFAULT_MINUTES = 10;

interface CancelUnpaidInput {
  areas?: string[];
  limitPerArea?: number;
  minutes?: number;
  dryRun?: boolean;
}

function validateInput(body: unknown): body is CancelUnpaidInput {
  if (!body || typeof body !== "object") return false;
  const obj = body as Record<string, unknown>;
  if (obj.areas !== undefined && !Array.isArray(obj.areas)) return false;
  if (obj.limitPerArea !== undefined && typeof obj.limitPerArea !== "number") return false;
  if (obj.minutes !== undefined && typeof obj.minutes !== "number") return false;
  if (obj.dryRun !== undefined && typeof obj.dryRun !== "boolean") return false;
  return true;
}

function addMinutes(isoDate: string, minutes: number): string {
  return new Date(new Date(isoDate).getTime() + minutes * 60 * 1000).toISOString();
}

export async function POST(request: Request) {
  const token = request.headers.get("x-ops-token");
  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return new NextResponse("Not Found", { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!validateInput(body)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const areas = body.areas || DEFAULT_AREAS;
  const limitPerArea = body.limitPerArea || DEFAULT_LIMIT;
  const minutes = body.minutes || DEFAULT_MINUTES;
  const dryRun = body.dryRun || false;

  const now = new Date().toISOString();
  let cancelled = 0;
  let skipped = 0;
  const cancelledBookings: string[] = [];

  try {
    for (const area of areas) {
      const result = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: "GSI1",
          KeyConditionExpression: "GSI1PK = :pk",
          ExpressionAttributeValues: {
            ":pk": `AREA#${area}#STATUS#PENDING_PAYMENT`,
          },
          Limit: limitPerArea,
        })
      );

      for (const booking of result.Items || []) {
        const { bookingId, createdAt } = booking;

        if (!createdAt) {
          skipped++;
          continue;
        }

        const expiryTime = addMinutes(createdAt, minutes);
        if (now <= expiryTime) {
          skipped++;
          continue;
        }

        if (dryRun) {
          cancelled++;
          cancelledBookings.push(bookingId);
          continue;
        }

        try {
          await ddb.send(
            new UpdateCommand({
              TableName: TABLE_NAME,
              Key: {
                PK: `BOOKING#${bookingId}`,
                SK: "BOOKING",
              },
              UpdateExpression:
                "SET #status = :cancelled, updatedAt = :now, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk",
              ConditionExpression: "#status = :pending",
              ExpressionAttributeNames: {
                "#status": "status",
              },
              ExpressionAttributeValues: {
                ":cancelled": "CANCELLED",
                ":pending": "PENDING_PAYMENT",
                ":now": now,
                ":gsi1pk": `AREA#${area}#STATUS#CANCELLED`,
                ":gsi1sk": `BOOKING#${bookingId}`,
              },
            })
          );

          await ddb.send(
            new PutCommand({
              TableName: TABLE_NAME,
              Item: {
                PK: `BOOKING#${bookingId}`,
                SK: `EVENT#${now}#booking_cancelled_unpaid`,
                type: "EVENT",
                eventName: "booking_cancelled_unpaid",
                at: now,
                meta: { via: "scheduler_unpaid" },
              },
            })
          );

          cancelled++;
          cancelledBookings.push(bookingId);
        } catch (err) {
          if ((err as Error).name === "ConditionalCheckFailedException") {
            skipped++;
          } else {
            console.error(`[cancel-unpaid] Error processing ${bookingId}:`, (err as Error).message);
          }
        }
      }
    }

    return NextResponse.json({
      dryRun,
      minutes,
      summary: {
        cancelled,
        skipped,
      },
      cancelledBookings,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cancel-unpaid] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
