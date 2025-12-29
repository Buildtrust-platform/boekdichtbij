import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
  PutCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DDB_TABLE_NAME;
const AREAS = (process.env.AREAS || "ridderkerk,barendrecht,rotterdam_zuid").split(",");
const LIMIT_PER_AREA = parseInt(process.env.LIMIT_PER_AREA || "50", 10);
const WAVE2_MINUTES = parseInt(process.env.WAVE2_MINUTES || "5", 10);
const WAVE3_MINUTES = parseInt(process.env.WAVE3_MINUTES || "10", 10);
const WAVE2_COUNT = parseInt(process.env.WAVE2_COUNT || "3", 10);
const WAVE3_COUNT = parseInt(process.env.WAVE3_COUNT || "3", 10);

// ==================================================
// AREA REGISTRY (mirrored from src/config/locations.ts)
// ==================================================
const AREA_REGISTRY = {
  ridderkerk: {
    city: "rotterdam",
    enabled: true,
    neighbors: ["barendrecht", "rotterdam-zuid"],
    rolloutStatus: "live",
  },
  barendrecht: {
    city: "rotterdam",
    enabled: true,
    neighbors: ["ridderkerk", "rotterdam-zuid"],
    rolloutStatus: "pilot",
  },
  "rotterdam-zuid": {
    city: "rotterdam",
    enabled: true,
    neighbors: ["ridderkerk", "barendrecht", "schiedam"],
    rolloutStatus: "pilot",
  },
  schiedam: {
    city: "rotterdam",
    enabled: true,
    neighbors: ["rotterdam-zuid", "vlaardingen"],
    rolloutStatus: "hidden",
  },
  vlaardingen: {
    city: "rotterdam",
    enabled: true,
    neighbors: ["schiedam"],
    rolloutStatus: "hidden",
  },
  "capelle-aan-den-ijssel": {
    city: "rotterdam",
    enabled: true,
    neighbors: ["rotterdam-zuid"],
    rolloutStatus: "hidden",
  },
};

// Convert area slug to DB key format (e.g., "rotterdam-zuid" -> "rotterdam_zuid")
function getAreaDbKey(areaSlug) {
  return areaSlug.replace(/-/g, "_");
}

// Convert DB key to area slug (e.g., "rotterdam_zuid" -> "rotterdam-zuid")
function getAreaSlug(dbKey) {
  return dbKey.replace(/_/g, "-");
}

// ==================================================
// AREA OVERRIDE HELPERS
// ==================================================
async function getAreaOverride(city, areaKey) {
  try {
    const result = await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `AREA#${city}#${areaKey}`,
          SK: "CONFIG",
        },
      })
    );

    if (!result.Item) {
      return null;
    }

    return {
      rolloutStatus: result.Item.rolloutStatus,
      enabled: result.Item.enabled,
    };
  } catch (err) {
    console.error("[waves] getAreaOverride error:", err);
    return null;
  }
}

async function getEffectiveAreaConfig(city, areaKey) {
  const registryConfig = AREA_REGISTRY[areaKey];

  if (!registryConfig) {
    return { enabled: false, rolloutStatus: "hidden" };
  }

  let enabled = registryConfig.enabled;
  let rolloutStatus = registryConfig.rolloutStatus;

  try {
    const override = await getAreaOverride(city, areaKey);
    if (override) {
      if (override.rolloutStatus !== undefined) {
        rolloutStatus = override.rolloutStatus;
      }
      if (override.enabled !== undefined) {
        enabled = override.enabled;
      }
    }
  } catch {
    // Fallback to registry on error
  }

  return { enabled, rolloutStatus };
}

async function getWave3Areas(city, areaKey) {
  const registryConfig = AREA_REGISTRY[areaKey];

  if (!registryConfig || !registryConfig.neighbors) {
    return [];
  }

  const eligibleNeighbors = [];

  for (const neighborKey of registryConfig.neighbors) {
    const neighborConfig = await getEffectiveAreaConfig(city, neighborKey);

    if (neighborConfig.enabled && neighborConfig.rolloutStatus !== "hidden") {
      eligibleNeighbors.push(neighborKey);
    }
  }

  return eligibleNeighbors;
}

// ==================================================
// DISPATCH HELPERS
// ==================================================

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

async function getEligibleProviders(area, excludeIds, limit, requiredGender) {
  // Convert area slug to DB key format for GSI2 query
  const dbAreaKey = getAreaDbKey(area);

  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `AREA#${dbAreaKey}`,
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

    // Gender service filtering with backwards compatibility
    const genderServices = provider.genderServices || ["men"];
    if (requiredGender && !genderServices.includes(requiredGender)) continue;

    eligible.push(provider);
  }
  return eligible;
}

async function getEligibleProvidersFromNeighbors(
  city,
  areaKey,
  excludeIds,
  limit,
  requiredGender
) {
  const neighborAreas = await getWave3Areas(city, areaKey);
  const providers = [];
  const neighborAreasTried = [];
  const neighborAreasUsed = [];

  for (const neighborKey of neighborAreas) {
    if (providers.length >= limit) break;

    neighborAreasTried.push(neighborKey);
    const remaining = limit - providers.length;

    const neighborProviders = await getEligibleProviders(
      neighborKey,
      excludeIds,
      remaining,
      requiredGender
    );

    if (neighborProviders.length > 0) {
      neighborAreasUsed.push(neighborKey);

      // Add sourceArea to each provider for audit
      for (const p of neighborProviders) {
        p.sourceArea = neighborKey;
        providers.push(p);
        excludeIds.add(p.providerId);
      }
    }
  }

  return { providers, neighborAreasTried, neighborAreasUsed };
}

async function sendWaveNotifications(booking, providers, wave, extraMeta = {}) {
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
          sourceArea: provider.sourceArea || area,
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
          ...extraMeta,
        },
      },
    })
  );

  return providers.length;
}

async function writeBroadcastSkippedEvent(bookingId, wave, reason, extraMeta = {}) {
  const now = new Date().toISOString();

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `BOOKING#${bookingId}`,
        SK: `EVENT#${now}#broadcast_skipped`,
        type: "EVENT",
        eventName: "broadcast_skipped",
        at: now,
        meta: {
          wave,
          reason,
          via: "scheduler_waves",
          ...extraMeta,
        },
      },
    })
  );
}

// ==================================================
// MAIN HANDLER
// ==================================================
export async function handler() {
  const now = new Date().toISOString();
  let wave2Sent = 0;
  let wave3Sent = 0;
  let skipped = 0;

  for (const area of AREAS) {
    // Convert DB area key to registry slug for lookups
    const areaSlug = getAreaSlug(area);
    const registryConfig = AREA_REGISTRY[areaSlug];
    // TODO: Store city on booking. For now assume rotterdam.
    const city = registryConfig?.city || "rotterdam";

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
      const {
        bookingId,
        dispatchStartedAt,
        assignmentDeadline,
        wave2SentAt,
        wave3SentAt,
        serviceType,
      } = booking;

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

      // Determine required gender from service type
      let requiredGender = "men";
      if (serviceType === "dameskapper") {
        requiredGender = "women";
      }

      // Wave 2 - same area, backup providers
      if (!wave2SentAt && now >= wave2Due) {
        const providers = await getEligibleProviders(
          areaSlug,
          notifiedIds,
          WAVE2_COUNT,
          requiredGender
        );

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

      // Wave 3 - neighbor areas spillover
      if (!wave3SentAt && now >= wave3Due) {
        const { providers, neighborAreasTried, neighborAreasUsed } =
          await getEligibleProvidersFromNeighbors(
            city,
            areaSlug,
            notifiedIds,
            WAVE3_COUNT,
            requiredGender
          );

        if (providers.length > 0) {
          const count = await sendWaveNotifications(booking, providers, 3, {
            neighborAreasTried,
            neighborAreasUsed,
            spilloverMode: "neighbors",
          });
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

          console.log(
            `[waves] Wave 3 sent for ${bookingId}: ${count} providers from neighbors: ${neighborAreasUsed.join(", ")}`
          );
        } else {
          // No eligible neighbors - write skip event
          await writeBroadcastSkippedEvent(bookingId, 3, "no_eligible_neighbors", {
            neighborAreasTried,
            spilloverMode: "neighbors",
          });

          // Still mark wave3SentAt to prevent retries
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

          console.log(
            `[waves] Wave 3 skipped for ${bookingId}: no eligible neighbors (tried: ${neighborAreasTried.join(", ")})`
          );
        }
      }
    }
  }

  console.log(`[waves] Done. Wave2: ${wave2Sent}, Wave3: ${wave3Sent}, Skipped: ${skipped}`);
  return { wave2Sent, wave3Sent, skipped };
}
