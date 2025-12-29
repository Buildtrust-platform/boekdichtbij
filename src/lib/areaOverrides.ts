import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./ddb";

export interface AreaOverride {
  rolloutStatus?: "hidden" | "pilot" | "live";
  enabled?: boolean;
}

interface AreaConfigItem {
  PK: string;
  SK: string;
  type: "AREA_CONFIG";
  city: string;
  areaKey: string;
  rolloutStatus?: "hidden" | "pilot" | "live";
  enabled?: boolean;
  updatedAt: string;
  updatedBy: string;
}

export async function getAreaOverride(
  city: string,
  areaKey: string
): Promise<AreaOverride | null> {
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

    const item = result.Item as AreaConfigItem;
    return {
      rolloutStatus: item.rolloutStatus,
      enabled: item.enabled,
    };
  } catch (err) {
    console.error("[areaOverrides] getAreaOverride error:", err);
    return null;
  }
}

export async function setAreaOverride(
  city: string,
  areaKey: string,
  patch: { rolloutStatus: "hidden" | "pilot" | "live" },
  previousStatus?: string
): Promise<void> {
  const now = new Date().toISOString();

  // Upsert CONFIG item
  const configItem: AreaConfigItem = {
    PK: `AREA#${city}#${areaKey}`,
    SK: "CONFIG",
    type: "AREA_CONFIG",
    city,
    areaKey,
    rolloutStatus: patch.rolloutStatus,
    updatedAt: now,
    updatedBy: "ops",
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: configItem,
    })
  );

  // Write audit event
  const eventItem = {
    PK: `AREA#${city}#${areaKey}`,
    SK: `EVENT#${now}#rollout_changed`,
    type: "EVENT",
    eventName: "rollout_changed",
    at: now,
    meta: {
      fromStatus: previousStatus || "unknown",
      toStatus: patch.rolloutStatus,
    },
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: eventItem,
    })
  );

  console.log(
    `[areaOverrides] Set rolloutStatus for ${city}/${areaKey}: ${previousStatus || "unknown"} -> ${patch.rolloutStatus}`
  );
}
