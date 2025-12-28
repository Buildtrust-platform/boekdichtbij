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
const NEARBY_AREA = process.env.NEARBY_AREA || "rotterdam_zuid";
const LIMIT_PER_AREA = parseInt(process.env.LIMIT_PER_AREA || "50", 10);
const WAVE2_MINUTES = parseInt(process.env.WAVE2_MINUTES || "5", 10);
const WAVE3_MINUTES = parseInt(process.env.WAVE3_MINUTES || "10", 10);
const WAVE2_COUNT = parseInt(process.env.WAVE2_COUNT || "3", 10);
const WAVE3_COUNT = parseInt(process.env.WAVE3_COUNT || "3", 10);

// TODO: Replace with actual Twilio sendWhatsApp when ready
async function sendWhatsApp(to, text) {
  console.log(`[WhatsApp STUB] To: ${to}`);
  console.log(`[WhatsApp STUB] Message: ${text}`);
  return { ok: true, mode: "stub" };
}

function addMinutes(isoDate, minutes) {
  return new Date(new Date(isoDate).getTime() + minutes * 60 * 1000).toISOString();
}

async function getNotifiedProviderIds(bookingId) {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `BOOKING#${bookingId}`,
        ":sk": "BROADCAST#",
      },
    })
  );
  return new Set((result.Items || []).map((item) => item.providerId));
}

async function getEligibleProviders(area, excludeIds, limit) {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `AREA#${area}`,
      },
      ScanIndexForward: false,
      Limit: limit + excludeIds.size + 10,
    })
  );

  const eligible = [];
  for (const provider of result.Items || []) {
    if (eligible.length >= limit) break;
    if (excludeIds.has(provider.providerId)) continue;
    if (!provider.isActive) continue;
    if (provider.whatsappStatus === "INVALID") continue;
    if (!provider.whatsappPhone) continue;
    eligible.push(provider);
  }
  return eligible;
}

async function sendWaveNotifications(booking, providers, wave) {
  const now = new Date().toISOString();
  const { bookingId, serviceName, timeWindowLabel, area } = booking;

  for (const provider of providers) {
    const text = `Nieuwe boeking via BoekDichtbij

Dienst: ${serviceName || "Knipbeurt"}
Tijdvak: ${timeWindowLabel || "Vandaag"}
Locatie: ${area}

Antwoord JA om te accepteren.`;

    await sendWhatsApp(provider.whatsappPhone, text);

    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `BOOKING#${bookingId}`,
          SK: `BROADCAST#${provider.providerId}#${now}`,
          type: "BROADCAST",
          providerId: provider.providerId,
          providerName: provider.name,
          wave,
          sentAt: now,
        },
      })
    );
  }

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `BOOKING#${bookingId}`,
        SK: `EVENT#${now}#broadcast_sent`,
        type: "EVENT",
        eventName: "broadcast_sent",
        at: now,
        meta: {
          wave,
          providerCount: providers.length,
          via: "scheduler_waves",
        },
      },
    })
  );

  return providers.length;
}

export async function handler() {
  const now = new Date().toISOString();
  let wave2Sent = 0;
  let wave3Sent = 0;
  let skipped = 0;

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
      const { bookingId, dispatchStartedAt, assignmentDeadline, wave2SentAt, wave3SentAt } = booking;

      if (!dispatchStartedAt || !assignmentDeadline) {
        skipped++;
        continue;
      }

      if (now >= assignmentDeadline) {
        skipped++;
        continue;
      }

      const wave2Due = addMinutes(dispatchStartedAt, WAVE2_MINUTES);
      const wave3Due = addMinutes(dispatchStartedAt, WAVE3_MINUTES);

      const notifiedIds = await getNotifiedProviderIds(bookingId);

      // Wave 2
      if (!wave2SentAt && now >= wave2Due) {
        const providers = await getEligibleProviders(area, notifiedIds, WAVE2_COUNT);

        if (providers.length > 0) {
          const count = await sendWaveNotifications(booking, providers, 2);
          wave2Sent += count;

          providers.forEach((p) => notifiedIds.add(p.providerId));

          await ddb.send(
            new UpdateCommand({
              TableName: TABLE_NAME,
              Key: {
                PK: `BOOKING#${bookingId}`,
                SK: "BOOKING",
              },
              UpdateExpression: "SET wave2SentAt = :now, updatedAt = :now",
              ConditionExpression: "attribute_not_exists(wave2SentAt)",
              ExpressionAttributeValues: {
                ":now": now,
              },
            })
          ).catch((err) => {
            if (err.name !== "ConditionalCheckFailedException") throw err;
          });

          console.log(`[waves] Wave 2 sent for ${bookingId}: ${count} providers`);
        }
      }

      // Wave 3
      if (!wave3SentAt && now >= wave3Due) {
        const providers = await getEligibleProviders(NEARBY_AREA, notifiedIds, WAVE3_COUNT);

        if (providers.length > 0) {
          const count = await sendWaveNotifications(booking, providers, 3);
          wave3Sent += count;

          await ddb.send(
            new UpdateCommand({
              TableName: TABLE_NAME,
              Key: {
                PK: `BOOKING#${bookingId}`,
                SK: "BOOKING",
              },
              UpdateExpression: "SET wave3SentAt = :now, updatedAt = :now",
              ConditionExpression: "attribute_not_exists(wave3SentAt)",
              ExpressionAttributeValues: {
                ":now": now,
              },
            })
          ).catch((err) => {
            if (err.name !== "ConditionalCheckFailedException") throw err;
          });

          console.log(`[waves] Wave 3 sent for ${bookingId}: ${count} providers`);
        }
      }
    }
  }

  console.log(`[waves] Done. Wave2: ${wave2Sent}, Wave3: ${wave3Sent}, Skipped: ${skipped}`);
  return { wave2Sent, wave3Sent, skipped };
}
