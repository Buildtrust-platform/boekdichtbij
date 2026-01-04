/**
 * POST /api/cron/area-health
 *
 * Automated area health check and guardrails enforcement.
 * Runs daily via cron or manually via ops token.
 *
 * Actions performed:
 * 1. Classify each area-vertical as STABLE, AT_RISK, or NOT_READY
 * 2. Auto-disable services in areas with persistent fulfillment failure
 * 3. Auto-deactivate providers with low reliability or failed WhatsApp
 * 4. Generate alerts for areas requiring attention
 *
 * Thresholds (from Operational Stabilization Playbook):
 * - STABLE: activeClaimedProviders >= 3, assignedRate >= 70%, unfilledRate <= 15%, wave2Rate <= 40%
 * - AT_RISK: activeClaimedProviders 1-2, or unfilledRate 16-30%, or wave2Rate 41-60%
 * - NOT_READY: activeClaimedProviders = 0, or unfilledRate > 30%, or assignedRate < 50%
 */

import { NextResponse } from "next/server";
import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { AREAS } from "@/config/locations";

const OPS_TOKEN = process.env.OPS_TOKEN;

// Verticals to check
const VERTICALS = ["herenkapper", "dameskapper", "schoonmaak"] as const;

// Classification thresholds
const THRESHOLDS = {
  // Provider counts
  STABLE_MIN_PROVIDERS: 3,
  AT_RISK_MIN_PROVIDERS: 1,

  // Assigned rate (7-day)
  STABLE_MIN_ASSIGNED_RATE: 0.70,
  NOT_READY_MIN_ASSIGNED_RATE: 0.50,

  // Unfilled rate (7-day)
  STABLE_MAX_UNFILLED_RATE: 0.15,
  AT_RISK_MAX_UNFILLED_RATE: 0.30,

  // Wave 2 trigger rate
  STABLE_MAX_WAVE2_RATE: 0.40,
  AT_RISK_MAX_WAVE2_RATE: 0.60,

  // Provider reliability
  DEACTIVATE_RELIABILITY_THRESHOLD: 20,
  MIN_OFFERS_FOR_DEACTIVATION: 5,

  // WhatsApp failure
  WHATSAPP_FAILURE_DAYS: 3,

  // Auto-pause threshold
  AUTO_PAUSE_UNFILLED_RATE: 0.40,
  AUTO_PAUSE_MIN_BOOKINGS: 3,
};

type Classification = "STABLE" | "AT_RISK" | "NOT_READY";

interface ProviderItem {
  providerId: string;
  name?: string;
  area: string;
  vertical?: string;
  isActive?: boolean;
  claimedAt?: string;
  whatsappPhone?: string;
  whatsappStatus?: string;
  whatsappLastSuccess?: string;
  reliabilityScore?: number;
  offeredCount?: number;
  acceptedCount?: number;
}

interface AreaVerticalHealth {
  area: string;
  vertical: string;
  classification: Classification;
  activeClaimedProviders: number;
  totalProviders: number;
  assignedRate: number;
  unfilledRate: number;
  wave2Rate: number;
  totalBookings7d: number;
  alerts: string[];
  actions: string[];
}

interface GuardrailAction {
  type: "SERVICE_DISABLED" | "AREA_PAUSED" | "PROVIDER_DEACTIVATED";
  area: string;
  vertical?: string;
  serviceKey?: string;
  providerId?: string;
  reason: string;
  timestamp: string;
}

/**
 * Classify an area-vertical based on metrics
 */
function classifyAreaVertical(
  activeClaimedProviders: number,
  assignedRate: number,
  unfilledRate: number,
  wave2Rate: number
): Classification {
  // NOT_READY checks (most severe first)
  if (activeClaimedProviders === 0) return "NOT_READY";
  if (unfilledRate > THRESHOLDS.AT_RISK_MAX_UNFILLED_RATE) return "NOT_READY";
  if (assignedRate < THRESHOLDS.NOT_READY_MIN_ASSIGNED_RATE) return "NOT_READY";
  if (
    activeClaimedProviders < THRESHOLDS.STABLE_MIN_PROVIDERS &&
    wave2Rate > THRESHOLDS.AT_RISK_MAX_WAVE2_RATE
  ) {
    return "NOT_READY";
  }

  // AT_RISK checks
  if (activeClaimedProviders < THRESHOLDS.STABLE_MIN_PROVIDERS) return "AT_RISK";
  if (unfilledRate > THRESHOLDS.STABLE_MAX_UNFILLED_RATE) return "AT_RISK";
  if (wave2Rate > THRESHOLDS.STABLE_MAX_WAVE2_RATE) return "AT_RISK";

  // STABLE
  return "STABLE";
}

/**
 * Query providers for an area
 */
async function getProvidersForArea(area: string): Promise<ProviderItem[]> {
  const providers: ProviderItem[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI2",
        KeyConditionExpression: "GSI2PK = :pk",
        ExpressionAttributeValues: {
          ":pk": `AREA#${area}`,
        },
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of result.Items || []) {
      providers.push(item as ProviderItem);
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return providers;
}

/**
 * Get 7-day metrics for an area
 */
async function get7DayMetrics(
  area: string
): Promise<{
  totalBookings: number;
  assigned: number;
  unfilled: number;
  assignedRate: number;
  unfilledRate: number;
}> {
  // Get dates for last 7 days
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }

  let totalBookings = 0;
  let assigned = 0;
  let unfilled = 0;

  // Query metrics for each date
  for (const date of dates) {
    try {
      const result = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "PK = :pk AND SK = :sk",
          ExpressionAttributeValues: {
            ":pk": `METRIC#AREA#${area}`,
            ":sk": `DATE#${date}`,
          },
        })
      );

      const metric = result.Items?.[0];
      if (metric && metric.totals) {
        totalBookings += metric.totals.totalBookings || 0;
        assigned += metric.totals.assigned || 0;
        unfilled += metric.totals.unfilled || 0;
      }
    } catch {
      // Metric may not exist for this date
    }
  }

  return {
    totalBookings,
    assigned,
    unfilled,
    assignedRate: totalBookings > 0 ? assigned / totalBookings : 0,
    unfilledRate: totalBookings > 0 ? unfilled / totalBookings : 0,
  };
}

/**
 * Disable all services for an area-vertical
 */
async function disableServicesForAreaVertical(
  area: string,
  vertical: string
): Promise<string[]> {
  const disabled: string[] = [];

  // Query all services for this area-vertical
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `SERVICE_CONFIG#AREA#${area}#VERTICAL#${vertical}`,
      },
    })
  );

  const now = new Date().toISOString();

  for (const item of result.Items || []) {
    if (item.isEnabled === true) {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: item.PK,
            SK: item.SK,
          },
          UpdateExpression: "SET isEnabled = :disabled, updatedAt = :now, disabledReason = :reason",
          ExpressionAttributeValues: {
            ":disabled": false,
            ":now": now,
            ":reason": "AUTO_GUARDRAIL: High unfilled rate",
          },
        })
      );
      disabled.push(item.serviceKey);
    }
  }

  return disabled;
}

/**
 * Deactivate a provider
 */
async function deactivateProvider(
  providerId: string,
  reason: string
): Promise<boolean> {
  const now = new Date().toISOString();

  try {
    // Try PROFILE SK first
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `PROVIDER#${providerId}`,
          SK: "PROFILE",
        },
        UpdateExpression:
          "SET isActive = :inactive, updatedAt = :now, deactivatedReason = :reason, deactivatedAt = :now",
        ExpressionAttributeValues: {
          ":inactive": false,
          ":now": now,
          ":reason": reason,
        },
      })
    );
    return true;
  } catch {
    // Try PROVIDER SK
    try {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `PROVIDER#${providerId}`,
            SK: "PROVIDER",
          },
          UpdateExpression:
            "SET isActive = :inactive, updatedAt = :now, deactivatedReason = :reason, deactivatedAt = :now",
          ExpressionAttributeValues: {
            ":inactive": false,
            ":now": now,
            ":reason": reason,
          },
        })
      );
      return true;
    } catch {
      return false;
    }
  }
}

export async function POST(request: Request) {
  // Token check
  const token = request.headers.get("x-ops-token");
  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const areaHealthResults: AreaVerticalHealth[] = [];
  const guardrailActions: GuardrailAction[] = [];
  const allAlerts: string[] = [];

  try {
    // Process each area
    for (const [areaKey] of Object.entries(AREAS)) {
      // Get providers for this area
      const providers = await getProvidersForArea(areaKey);

      // Get 7-day metrics
      const metrics = await get7DayMetrics(areaKey);

      // Estimate wave2 rate (if we had that data - for now use 0)
      // In a full implementation, this would query booking dispatch logs
      const wave2Rate = 0;

      // Process each vertical
      for (const vertical of VERTICALS) {
        // Filter providers for this vertical
        const verticalProviders = providers.filter((p) => {
          const pVertical = p.vertical || "herenkapper";
          return pVertical === vertical;
        });

        const activeClaimedProviders = verticalProviders.filter(
          (p) => p.isActive !== false && p.claimedAt
        ).length;

        const classification = classifyAreaVertical(
          activeClaimedProviders,
          metrics.assignedRate,
          metrics.unfilledRate,
          wave2Rate
        );

        const alerts: string[] = [];
        const actions: string[] = [];

        // Generate alerts based on classification
        if (classification === "NOT_READY") {
          alerts.push(`URGENT: ${areaKey}/${vertical} is NOT_READY`);
          allAlerts.push(`🔴 ${areaKey}/${vertical}: NOT_READY`);
        } else if (classification === "AT_RISK") {
          alerts.push(`WARNING: ${areaKey}/${vertical} is AT_RISK`);
          allAlerts.push(`🟡 ${areaKey}/${vertical}: AT_RISK`);
        }

        // Guardrail: Auto-pause area-vertical with high unfilled rate
        if (
          metrics.unfilledRate > THRESHOLDS.AUTO_PAUSE_UNFILLED_RATE &&
          metrics.totalBookings >= THRESHOLDS.AUTO_PAUSE_MIN_BOOKINGS
        ) {
          const disabledServices = await disableServicesForAreaVertical(
            areaKey,
            vertical
          );

          if (disabledServices.length > 0) {
            actions.push(
              `Auto-disabled services: ${disabledServices.join(", ")}`
            );

            guardrailActions.push({
              type: "AREA_PAUSED",
              area: areaKey,
              vertical,
              reason: `Unfilled rate ${(metrics.unfilledRate * 100).toFixed(1)}% exceeds ${THRESHOLDS.AUTO_PAUSE_UNFILLED_RATE * 100}%`,
              timestamp: new Date().toISOString(),
            });
          }
        }

        areaHealthResults.push({
          area: areaKey,
          vertical,
          classification,
          activeClaimedProviders,
          totalProviders: verticalProviders.length,
          assignedRate: metrics.assignedRate,
          unfilledRate: metrics.unfilledRate,
          wave2Rate,
          totalBookings7d: metrics.totalBookings,
          alerts,
          actions,
        });
      }

      // Guardrail: Check for providers needing deactivation
      for (const provider of providers) {
        // Skip already inactive providers
        if (provider.isActive === false) continue;

        // Check low reliability
        const reliability = provider.reliabilityScore ?? 50;
        const offeredCount = provider.offeredCount ?? 0;

        if (
          reliability < THRESHOLDS.DEACTIVATE_RELIABILITY_THRESHOLD &&
          offeredCount >= THRESHOLDS.MIN_OFFERS_FOR_DEACTIVATION
        ) {
          const deactivated = await deactivateProvider(
            provider.providerId,
            `AUTO: Reliability ${reliability} below ${THRESHOLDS.DEACTIVATE_RELIABILITY_THRESHOLD}`
          );

          if (deactivated) {
            guardrailActions.push({
              type: "PROVIDER_DEACTIVATED",
              area: provider.area,
              providerId: provider.providerId,
              reason: `Low reliability score: ${reliability}`,
              timestamp: new Date().toISOString(),
            });
          }
        }

        // Check WhatsApp failure
        if (provider.whatsappStatus === "FAILED") {
          const lastSuccess = provider.whatsappLastSuccess;
          let daysSinceSuccess = Infinity;

          if (lastSuccess) {
            const lastDate = new Date(lastSuccess);
            const now = new Date();
            daysSinceSuccess = Math.floor(
              (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
            );
          }

          if (daysSinceSuccess > THRESHOLDS.WHATSAPP_FAILURE_DAYS) {
            const deactivated = await deactivateProvider(
              provider.providerId,
              `AUTO: WhatsApp unreachable for ${daysSinceSuccess}+ days`
            );

            if (deactivated) {
              guardrailActions.push({
                type: "PROVIDER_DEACTIVATED",
                area: provider.area,
                providerId: provider.providerId,
                reason: `WhatsApp failed for ${daysSinceSuccess} days`,
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
      }
    }

    // Summary counts
    const summary = {
      stable: areaHealthResults.filter((r) => r.classification === "STABLE")
        .length,
      atRisk: areaHealthResults.filter((r) => r.classification === "AT_RISK")
        .length,
      notReady: areaHealthResults.filter((r) => r.classification === "NOT_READY")
        .length,
      totalAreaVerticals: areaHealthResults.length,
      guardrailActionsCount: guardrailActions.length,
    };

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      ok: true,
      executedAt: new Date().toISOString(),
      durationMs,
      summary,
      alerts: allAlerts,
      guardrailActions,
      areaHealth: areaHealthResults,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cron/area-health] Error:", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET endpoint for status check
export async function GET(request: Request) {
  const token = request.headers.get("x-ops-token");
  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    endpoint: "/api/cron/area-health",
    description: "Automated area health check and guardrails enforcement",
    method: "POST to execute, GET for info",
    thresholds: THRESHOLDS,
  });
}
