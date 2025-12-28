import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DDB_TABLE_NAME;
const AREAS = (process.env.AREAS || "ridderkerk,barendrecht,rotterdam_zuid").split(",");
const LIMIT_PER_AREA = parseInt(process.env.LIMIT_PER_AREA || "50", 10);

export async function handler() {
  const now = new Date().toISOString();
  let expiredCount = 0;
  let skippedCount = 0;

  for (const area of AREAS) {
    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: {
          ":pk": `AREA#${area}#STATUS#PENDING_ASSIGNMENT`,
        },
        Limit: LIMIT_PER_AREA,
      })
    );

    for (const booking of result.Items || []) {
      const { bookingId, assignmentDeadline } = booking;

      if (!assignmentDeadline) {
        skippedCount++;
        continue;
      }

      if (now <= assignmentDeadline) {
        skippedCount++;
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
              "SET #status = :unfilled, updatedAt = :now, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk",
            ConditionExpression:
              "#status = :pending AND attribute_not_exists(assignedProviderId)",
            ExpressionAttributeNames: {
              "#status": "status",
            },
            ExpressionAttributeValues: {
              ":unfilled": "UNFILLED",
              ":pending": "PENDING_ASSIGNMENT",
              ":now": now,
              ":gsi1pk": `AREA#${area}#STATUS#UNFILLED`,
              ":gsi1sk": `BOOKING#${bookingId}`,
            },
          })
        );

        await ddb.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              PK: `BOOKING#${bookingId}`,
              SK: `EVENT#${now}#booking_unfilled`,
              type: "EVENT",
              eventName: "booking_unfilled",
              at: now,
              meta: { via: "scheduler_expiry" },
            },
          })
        );

        expiredCount++;
        console.log(`[expiry] Expired booking ${bookingId}`);
      } catch (err) {
        if (err.name === "ConditionalCheckFailedException") {
          console.log(`[expiry] Skipped ${bookingId}: condition not met`);
          skippedCount++;
        } else {
          console.error(`[expiry] Error processing ${bookingId}:`, err.message);
        }
      }
    }
  }

  console.log(`[expiry] Done. Expired: ${expiredCount}, Skipped: ${skippedCount}`);
  return { expired: expiredCount, skipped: skippedCount };
}
