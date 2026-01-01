import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { ddb, TABLE_NAME } from "./ddb";

/**
 * Minimal provider profile shape.
 * Allows extra fields via index signature.
 */
export interface ProviderProfile {
  PK: string;
  SK: string;
  providerId: string;
  area?: string;
  isActive?: boolean;
  claimedAt?: string;
  whatsappPhone?: string;
  whatsappStatus?: string;
  whatsappFailCount?: number;
  reliabilityScore?: number;
  GSI2PK?: string;
  GSI2SK?: string;
  createdAt?: string;
  updatedAt?: string;
  type?: string;
  [key: string]: unknown;
}

/**
 * Load a provider profile by providerId.
 * Implements migrate-on-read: if only legacy SK="PROVIDER" exists,
 * creates a new SK="PROFILE" item and returns it.
 */
export async function getProviderProfile(
  providerId: string
): Promise<ProviderProfile | null> {
  const pk = `PROVIDER#${providerId}`;

  // 1. Try canonical PROFILE first
  const profileResult = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: "PROFILE" },
    })
  );

  if (profileResult.Item) {
    return profileResult.Item as ProviderProfile;
  }

  // 2. Fallback to legacy PROVIDER
  const legacyResult = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: "PROVIDER" },
    })
  );

  if (!legacyResult.Item) {
    return null;
  }

  const legacyItem = legacyResult.Item;

  // 3. Build PROFILE item from legacy
  const now = new Date().toISOString();
  const profileItem: ProviderProfile = {
    ...legacyItem,
    SK: "PROFILE",
    type: "PROVIDER_PROFILE",
    updatedAt: now,
  } as ProviderProfile;

  // 4. Conditional write: only create if PROFILE doesn't exist
  try {
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: profileItem,
        ConditionExpression: "attribute_not_exists(SK)",
      })
    );

    console.log(
      `[providerStore] Migrated legacy provider to PROFILE: ${providerId}`
    );
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      // Another request already migrated; ignore
    } else {
      throw err;
    }
  }

  return profileItem;
}
