import { NextResponse } from "next/server";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { normalizeArea } from "@/lib/area";

const OPS_TOKEN = process.env.OPS_TOKEN;

interface ServiceSeedConfig {
  area: string;
  vertical: string;
  serviceKey: string;
  isEnabled: boolean;
  priceCents: number;
  payoutCents: number;
  durationMinutes: number;
}

// All 15 areas (must match URL slugs in locations.ts AREAS registry)
const ALL_AREAS = [
  "ridderkerk",
  "barendrecht",
  "zuid",      // URL slug, not "rotterdam-zuid"
  "west",      // URL slug, not "rotterdam-west"
  "schiedam",
  "vlaardingen",
  "capelle",
  "maassluis",
  "spijkenisse",
  "hoogvliet",
  "ijsselmonde",
  "krimpen",
  "berkel",
  "bergschenhoek",
  "bleiswijk",
];

// Service templates per vertical
const HERENKAPPER_SERVICES = [
  { serviceKey: "heren-standaard", priceCents: 3500, payoutCents: 2800, durationMinutes: 30 },
  { serviceKey: "heren-knip-baard", priceCents: 5000, payoutCents: 4000, durationMinutes: 45 },
  { serviceKey: "heren-special", priceCents: 6500, payoutCents: 5200, durationMinutes: 60 },
];

const DAMESKAPPER_SERVICES = [
  { serviceKey: "dames-kort", priceCents: 4500, payoutCents: 3600, durationMinutes: 45 },
  { serviceKey: "dames-lang", priceCents: 6000, payoutCents: 4800, durationMinutes: 60 },
  { serviceKey: "dames-special", priceCents: 8500, payoutCents: 6800, durationMinutes: 90 },
];

const SCHOONMAAK_SERVICES = [
  { serviceKey: "schoonmaak-basis", priceCents: 7500, payoutCents: 6000, durationMinutes: 120, isEnabled: true },
  { serviceKey: "ramen-binnen", priceCents: 4500, payoutCents: 3800, durationMinutes: 60, isEnabled: true },
  { serviceKey: "schoonmaak-groot", priceCents: 11500, payoutCents: 9200, durationMinutes: 180, isEnabled: false },
  { serviceKey: "eindschoonmaak", priceCents: 16500, payoutCents: 13200, durationMinutes: 240, isEnabled: false },
];

/**
 * Generate service configs for all areas and verticals
 */
function generateServiceConfigs(): ServiceSeedConfig[] {
  const configs: ServiceSeedConfig[] = [];

  for (const area of ALL_AREAS) {
    // Herenkapper services (all enabled)
    for (const svc of HERENKAPPER_SERVICES) {
      configs.push({
        area,
        vertical: "herenkapper",
        serviceKey: svc.serviceKey,
        isEnabled: true,
        priceCents: svc.priceCents,
        payoutCents: svc.payoutCents,
        durationMinutes: svc.durationMinutes,
      });
    }

    // Dameskapper services (all enabled)
    for (const svc of DAMESKAPPER_SERVICES) {
      configs.push({
        area,
        vertical: "dameskapper",
        serviceKey: svc.serviceKey,
        isEnabled: true,
        priceCents: svc.priceCents,
        payoutCents: svc.payoutCents,
        durationMinutes: svc.durationMinutes,
      });
    }

    // Schoonmaak services (some enabled, some disabled)
    for (const svc of SCHOONMAAK_SERVICES) {
      configs.push({
        area,
        vertical: "schoonmaak",
        serviceKey: svc.serviceKey,
        isEnabled: svc.isEnabled,
        priceCents: svc.priceCents,
        payoutCents: svc.payoutCents,
        durationMinutes: svc.durationMinutes,
      });
    }
  }

  return configs;
}

const SERVICE_CONFIGS: ServiceSeedConfig[] = generateServiceConfigs();

/**
 * POST /api/admin/services/seed
 *
 * Seeds service configuration items for controlled service rollout.
 * Requires x-ops-token header.
 */
export async function POST(request: Request) {
  const token = request.headers.get("x-ops-token");
  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();
  const results: { area: string; vertical: string; serviceKey: string; status: "ok" | "error" }[] = [];

  for (const config of SERVICE_CONFIGS) {
    const area = normalizeArea(config.area);
    const vertical = config.vertical.trim().toLowerCase();
    const serviceKey = config.serviceKey.trim().toLowerCase();

    try {
      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `SERVICE_CONFIG#AREA#${area}#VERTICAL#${vertical}`,
            SK: `SERVICE#${serviceKey}`,
            type: "SERVICE_CONFIG",
            area,
            vertical,
            serviceKey,
            isEnabled: config.isEnabled,
            priceCents: config.priceCents,
            payoutCents: config.payoutCents,
            durationMinutes: config.durationMinutes,
            createdAt: now,
            updatedAt: now,
          },
        })
      );
      results.push({ area, vertical, serviceKey, status: "ok" });
    } catch (err) {
      console.error("[seed-services] Failed to write service config:", area, vertical, serviceKey, err);
      results.push({ area, vertical, serviceKey, status: "error" });
    }
  }

  return NextResponse.json({
    seeded: results.filter((r) => r.status === "ok").length,
    results,
  });
}
