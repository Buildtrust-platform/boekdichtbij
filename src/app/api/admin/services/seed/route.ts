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

/**
 * Rotterdam-West cleaning service launch configuration.
 * schoonmaak-basis and ramen-binnen enabled.
 * schoonmaak-groot and eindschoonmaak disabled initially.
 */
const SERVICE_CONFIGS: ServiceSeedConfig[] = [
  // Rotterdam-West schoonmaak
  {
    area: "rotterdam-west",
    vertical: "schoonmaak",
    serviceKey: "schoonmaak-basis",
    isEnabled: true,
    priceCents: 7500,
    payoutCents: 6000,
    durationMinutes: 120,
  },
  {
    area: "rotterdam-west",
    vertical: "schoonmaak",
    serviceKey: "ramen-binnen",
    isEnabled: true,
    priceCents: 4500,
    payoutCents: 3800,
    durationMinutes: 60,
  },
  {
    area: "rotterdam-west",
    vertical: "schoonmaak",
    serviceKey: "schoonmaak-groot",
    isEnabled: false,
    priceCents: 11500,
    payoutCents: 9200,
    durationMinutes: 180,
  },
  {
    area: "rotterdam-west",
    vertical: "schoonmaak",
    serviceKey: "eindschoonmaak",
    isEnabled: false,
    priceCents: 16500,
    payoutCents: 13200,
    durationMinutes: 240,
  },
];

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
