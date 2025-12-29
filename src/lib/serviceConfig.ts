import { QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { normalizeArea } from "@/lib/area";

export interface ServiceConfigItem {
  area: string;
  vertical: string;
  serviceKey: string;
  isEnabled: boolean;
  priceCents: number;
  payoutCents: number;
  durationMinutes: number;
  updatedAt: string;
}

/**
 * List all enabled services for an area + vertical.
 * Used by booking pages to show available services.
 */
export async function listEnabledServices(
  area: string,
  vertical: string
): Promise<ServiceConfigItem[]> {
  const normalizedArea = normalizeArea(area);
  const normalizedVertical = vertical.trim().toLowerCase();

  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `SERVICE_CONFIG#AREA#${normalizedArea}#VERTICAL#${normalizedVertical}`,
        ":skPrefix": "SERVICE#",
      },
    })
  );

  const items = (result.Items || []) as ServiceConfigItem[];
  return items.filter((item) => item.isEnabled === true);
}

/**
 * Get a specific service configuration.
 * Returns null if not found.
 */
export async function getServiceConfig(
  area: string,
  vertical: string,
  serviceKey: string
): Promise<ServiceConfigItem | null> {
  const normalizedArea = normalizeArea(area);
  const normalizedVertical = vertical.trim().toLowerCase();
  const normalizedServiceKey = serviceKey.trim().toLowerCase();

  const result = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `SERVICE_CONFIG#AREA#${normalizedArea}#VERTICAL#${normalizedVertical}`,
        SK: `SERVICE#${normalizedServiceKey}`,
      },
    })
  );

  if (!result.Item) {
    return null;
  }

  return result.Item as ServiceConfigItem;
}
