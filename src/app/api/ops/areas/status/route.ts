/**
 * GET /api/ops/areas/status
 *
 * Returns area classification rollup for all Rotterdam areas.
 * Shows STABLE/AT_RISK/NOT_READY status per area-vertical.
 *
 * This is the primary ops dashboard endpoint for area health monitoring.
 */

import { NextResponse } from "next/server";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { AREAS } from "@/config/locations";

const OPS_TOKEN = process.env.OPS_TOKEN;

// Verticals to check
const VERTICALS = ["herenkapper", "dameskapper", "schoonmaak"] as const;

// Classification thresholds (same as cron/area-health)
const THRESHOLDS = {
  STABLE_MIN_PROVIDERS: 3,
  AT_RISK_MIN_PROVIDERS: 1,
  STABLE_MIN_ASSIGNED_RATE: 0.70,
  NOT_READY_MIN_ASSIGNED_RATE: 0.50,
  STABLE_MAX_UNFILLED_RATE: 0.15,
  AT_RISK_MAX_UNFILLED_RATE: 0.30,
  STABLE_MAX_WAVE2_RATE: 0.40,
  AT_RISK_MAX_WAVE2_RATE: 0.60,
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
  reliabilityScore?: number;
}

interface VerticalStatus {
  vertical: string;
  classification: Classification;
  activeClaimedProviders: number;
  totalProviders: number;
  enabledServices: number;
}

interface AreaStatus {
  area: string;
  label: string;
  overallClassification: Classification;
  verticals: VerticalStatus[];
  metrics7d: {
    totalBookings: number;
    assignedRate: number;
    unfilledRate: number;
  };
  alerts: string[];
}

interface RollupSummary {
  totalAreas: number;
  stable: number;
  atRisk: number;
  notReady: number;
  byVertical: {
    [vertical: string]: {
      stable: number;
      atRisk: number;
      notReady: number;
    };
  };
}

/**
 * Classify an area-vertical based on metrics
 */
function classifyAreaVertical(
  activeClaimedProviders: number,
  assignedRate: number,
  unfilledRate: number,
  wave2Rate: number = 0
): Classification {
  if (activeClaimedProviders === 0) return "NOT_READY";
  if (unfilledRate > THRESHOLDS.AT_RISK_MAX_UNFILLED_RATE) return "NOT_READY";
  if (assignedRate < THRESHOLDS.NOT_READY_MIN_ASSIGNED_RATE && assignedRate > 0) return "NOT_READY";
  if (
    activeClaimedProviders < THRESHOLDS.STABLE_MIN_PROVIDERS &&
    wave2Rate > THRESHOLDS.AT_RISK_MAX_WAVE2_RATE
  ) {
    return "NOT_READY";
  }

  if (activeClaimedProviders < THRESHOLDS.STABLE_MIN_PROVIDERS) return "AT_RISK";
  if (unfilledRate > THRESHOLDS.STABLE_MAX_UNFILLED_RATE) return "AT_RISK";
  if (wave2Rate > THRESHOLDS.STABLE_MAX_WAVE2_RATE) return "AT_RISK";

  return "STABLE";
}

/**
 * Get worst classification (for overall area status)
 */
function getWorstClassification(classifications: Classification[]): Classification {
  if (classifications.includes("NOT_READY")) return "NOT_READY";
  if (classifications.includes("AT_RISK")) return "AT_RISK";
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
 * Get enabled services count for an area-vertical
 */
async function getEnabledServicesCount(
  area: string,
  vertical: string
): Promise<number> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      FilterExpression: "isEnabled = :enabled",
      ExpressionAttributeValues: {
        ":pk": `SERVICE_CONFIG#AREA#${area}#VERTICAL#${vertical}`,
        ":enabled": true,
      },
    })
  );

  return result.Items?.length || 0;
}

/**
 * Get 7-day metrics for an area
 */
async function get7DayMetrics(
  area: string
): Promise<{
  totalBookings: number;
  assignedRate: number;
  unfilledRate: number;
}> {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }

  let totalBookings = 0;
  let assigned = 0;
  let unfilled = 0;

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
      // Metric may not exist
    }
  }

  return {
    totalBookings,
    assignedRate: totalBookings > 0 ? assigned / totalBookings : 0,
    unfilledRate: totalBookings > 0 ? unfilled / totalBookings : 0,
  };
}

export async function GET(request: Request) {
  const token = request.headers.get("x-ops-token");
  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const areaFilter = searchParams.get("area");

  try {
    const areaStatuses: AreaStatus[] = [];

    // Determine which areas to process
    const areasToProcess = areaFilter
      ? { [areaFilter]: AREAS[areaFilter] }
      : AREAS;

    for (const [areaKey, areaConfig] of Object.entries(areasToProcess)) {
      if (!areaConfig) continue;

      const providers = await getProvidersForArea(areaKey);
      const metrics = await get7DayMetrics(areaKey);
      const verticalStatuses: VerticalStatus[] = [];
      const alerts: string[] = [];

      for (const vertical of VERTICALS) {
        // Filter providers by vertical
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
          metrics.unfilledRate
        );

        const enabledServices = await getEnabledServicesCount(areaKey, vertical);

        verticalStatuses.push({
          vertical,
          classification,
          activeClaimedProviders,
          totalProviders: verticalProviders.length,
          enabledServices,
        });

        // Generate alerts
        if (classification === "NOT_READY" && enabledServices > 0) {
          alerts.push(
            `${vertical}: NOT_READY but has ${enabledServices} enabled services`
          );
        } else if (classification === "NOT_READY") {
          alerts.push(`${vertical}: NOT_READY (${activeClaimedProviders} providers)`);
        } else if (classification === "AT_RISK") {
          alerts.push(`${vertical}: AT_RISK (${activeClaimedProviders} providers)`);
        }
      }

      const overallClassification = getWorstClassification(
        verticalStatuses.map((v) => v.classification)
      );

      areaStatuses.push({
        area: areaKey,
        label: areaConfig.label,
        overallClassification,
        verticals: verticalStatuses,
        metrics7d: metrics,
        alerts,
      });
    }

    // Sort: NOT_READY first, then AT_RISK, then STABLE
    const classificationOrder: Record<Classification, number> = {
      NOT_READY: 0,
      AT_RISK: 1,
      STABLE: 2,
    };
    areaStatuses.sort(
      (a, b) =>
        classificationOrder[a.overallClassification] -
        classificationOrder[b.overallClassification]
    );

    // Build summary
    const summary: RollupSummary = {
      totalAreas: areaStatuses.length,
      stable: areaStatuses.filter((a) => a.overallClassification === "STABLE")
        .length,
      atRisk: areaStatuses.filter((a) => a.overallClassification === "AT_RISK")
        .length,
      notReady: areaStatuses.filter(
        (a) => a.overallClassification === "NOT_READY"
      ).length,
      byVertical: {},
    };

    for (const vertical of VERTICALS) {
      summary.byVertical[vertical] = {
        stable: 0,
        atRisk: 0,
        notReady: 0,
      };

      for (const area of areaStatuses) {
        const v = area.verticals.find((vs) => vs.vertical === vertical);
        if (v) {
          if (v.classification === "STABLE") summary.byVertical[vertical].stable++;
          else if (v.classification === "AT_RISK")
            summary.byVertical[vertical].atRisk++;
          else summary.byVertical[vertical].notReady++;
        }
      }
    }

    // Collect all alerts
    const allAlerts: string[] = [];
    for (const area of areaStatuses) {
      for (const alert of area.alerts) {
        allAlerts.push(`${area.area}: ${alert}`);
      }
    }

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      summary,
      alerts: allAlerts,
      areas: areaStatuses,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ops/areas/status] Error:", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
