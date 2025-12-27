import { NextResponse } from "next/server";
import {
  GetCommand,
  UpdateCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";

interface Booking {
  bookingId: string;
  status: string;
  area: string;
  createdAt: string;
  assignmentDeadline?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;

  const bookingResult = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
    })
  );

  if (!bookingResult.Item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const booking = bookingResult.Item as Booking;

  if (booking.status === "ASSIGNED") {
    return NextResponse.json({ status: "already_assigned" });
  }

  if (booking.status !== "PENDING_ASSIGNMENT") {
    return NextResponse.json({ error: "not_expirable" }, { status: 409 });
  }

  if (!booking.assignmentDeadline) {
    return NextResponse.json({ error: "missing_deadline" }, { status: 409 });
  }

  const now = new Date();
  const deadline = new Date(booking.assignmentDeadline);

  if (now <= deadline) {
    return NextResponse.json({ status: "not_expired_yet" });
  }

  const nowIso = now.toISOString();

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
          ":gsi1pk": `AREA#${booking.area}#STATUS#UNFILLED`,
        },
      })
    );
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return NextResponse.json({ status: "already_assigned" });
    }
    console.error("DynamoDB error:", error);
    return NextResponse.json({ error: "ddb_error" }, { status: 500 });
  }

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `BOOKING#${bookingId}`,
        SK: `EVENT#${nowIso}#booking_unfilled`,
        type: "EVENT",
        eventName: "booking_unfilled",
        at: nowIso,
      },
    })
  );

  return NextResponse.json({ status: "unfilled" });
}
