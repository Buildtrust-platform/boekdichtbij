import { NextResponse } from "next/server";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";

const OPS_TOKEN = process.env.OPS_TOKEN;

interface ProviderItem {
  providerId: string;
  isActive?: boolean;
  claimedAt?: string;
  whatsappPhone?: string;
  reliabilityScore?: number;
}

interface ProviderSummary {
  providerId: string;
  isActive: boolean;
  claimedAt: string | null;
  whatsappPhone: string | null;
  reliabilityScore: number;
}

/**
 * GET /api/ops/providers/hygiene
 *
 * Returns provider hygiene data for an area:
 * - Counts of providers in various states
 * - Lists of providers needing attention
 *
 * Query params:
 *   area (required) - Area key to query
 *   limit (optional) - Max providers to fetch (default 50, max 200)
 */
export async function GET(request: Request) {
  // Token protection
  const token = request.headers.get("x-ops-token");
  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const area = searchParams.get("area");
  const limitParam = searchParams.get("limit");

  if (!area) {
    return NextResponse.json({ error: "area_required" }, { status: 400 });
  }

  // Parse and clamp limit
  let limit = 50;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, 200);
    }
  }

  // Query providers via GSI2
  const providers: ProviderSummary[] = [];
  let lastKey: Record<string, unknown> | undefined;

  try {
    do {
      const result = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: "GSI2",
          KeyConditionExpression: "GSI2PK = :pk",
          ExpressionAttributeValues: {
            ":pk": `AREA#${area}`,
          },
          ScanIndexForward: true,
          ExclusiveStartKey: lastKey,
        })
      );

      for (const item of result.Items || []) {
        if (providers.length >= limit) break;

        const p = item as ProviderItem;
        providers.push({
          providerId: p.providerId,
          isActive: p.isActive === true,
          claimedAt: p.claimedAt || null,
          whatsappPhone: p.whatsappPhone || null,
          reliabilityScore: p.reliabilityScore ?? 50,
        });
      }

      lastKey = result.LastEvaluatedKey;
    } while (lastKey && providers.length < limit);
  } catch (err) {
    console.error("[hygiene] Failed to query providers:", err);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  // Compute counts and categorize
  let total = 0;
  let active = 0;
  let activeClaimed = 0;
  let activeUnclaimed = 0;
  let activeMissingWhatsApp = 0;
  let claimedInactive = 0;

  const activeUnclaimedList: ProviderSummary[] = [];
  const activeMissingWhatsAppList: ProviderSummary[] = [];
  const claimedInactiveList: ProviderSummary[] = [];

  for (const p of providers) {
    total++;

    const isActive = p.isActive;
    const hasClaim = !!p.claimedAt;
    const hasWhatsApp = !!p.whatsappPhone;

    if (isActive) {
      active++;

      if (hasClaim) {
        activeClaimed++;
      } else {
        activeUnclaimed++;
        activeUnclaimedList.push(p);
      }

      if (!hasWhatsApp) {
        activeMissingWhatsApp++;
        activeMissingWhatsAppList.push(p);
      }
    } else {
      // Inactive
      if (hasClaim) {
        claimedInactive++;
        claimedInactiveList.push(p);
      }
    }
  }

  return NextResponse.json({
    area,
    counts: {
      total,
      active,
      activeClaimed,
      activeUnclaimed,
      activeMissingWhatsApp,
      claimedInactive,
    },
    providers: {
      activeUnclaimed: activeUnclaimedList,
      activeMissingWhatsApp: activeMissingWhatsAppList,
      claimedInactive: claimedInactiveList,
    },
  });
}
