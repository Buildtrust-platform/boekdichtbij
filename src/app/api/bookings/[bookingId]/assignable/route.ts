import { NextResponse } from "next/server";
import { GetCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const now = new Date().toISOString();

  // Get booking to retrieve area and createdAt
  const getResult = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
    })
  );

  if (!getResult.Item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { area, createdAt } = getResult.Item;

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `BOOKING#${bookingId}`, SK: "BOOKING" },
        UpdateExpression:
          "SET #status = :newStatus, updatedAt = :now, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk",
        ConditionExpression: "#status = :currentStatus",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":currentStatus": "PENDING_PAYMENT",
          ":newStatus": "PENDING_ASSIGNMENT",
          ":now": now,
          ":gsi1pk": `AREA#${area}#STATUS#PENDING_ASSIGNMENT`,
          ":gsi1sk": `CREATED#${createdAt}#BOOKING#${bookingId}`,
        },
      })
    );

    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `BOOKING#${bookingId}`,
          SK: `EVENT#${now}#payment_confirmed`,
          type: "EVENT",
          eventName: "payment_confirmed",
          at: now,
        },
      })
    );

    return NextResponse.json({ status: "ready_for_dispatch" });
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return NextResponse.json({ error: "status_conflict" }, { status: 409 });
    }
    throw error;
  }
}
