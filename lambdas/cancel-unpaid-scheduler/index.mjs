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
const EXPIRY_MINUTES = parseInt(process.env.EXPIRY_MINUTES || "10", 10);

function addMinutes(isoDate, minutes) {
  return new Date(new Date(isoDate).getTime() + minutes * 60 * 1000).toISOString();
}

export async function handler() {
  const now = new Date().toISOString();
  let cancelled = 0;
  let skipped = 0;

  for (const area of AREAS) {
    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: {
          ":pk": `AREA#${area}#STATUS#PENDING_PAYMENT`,
        },
        Limit: LIMIT_PER_AREA,
      })
    );

    for (const booking of result.Items || []) {
      const { bookingId, createdAt } = booking;

      if (!createdAt) {
        skipped++;
        continue;
      }

      const expiryTime = addMinutes(createdAt, EXPIRY_MINUTES);
      if (now <= expiryTime) {
        skipped++;
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
        console.log(`[cancel-unpaid] Cancelled booking ${bookingId}`);
      } catch (err) {
        if (err.name === "ConditionalCheckFailedException") {
          console.log(`[cancel-unpaid] Skipped ${bookingId}: condition not met`);
          skipped++;
        } else {
          console.error(`[cancel-unpaid] Error processing ${bookingId}:`, err.message);
        }
      }
    }
  }

  console.log(`[cancel-unpaid] Done. Cancelled: ${cancelled}, Skipped: ${skipped}`);
  return { cancelled, skipped };
}
