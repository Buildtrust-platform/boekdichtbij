import { NextResponse } from "next/server";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { normalizeArea } from "@/lib/area";

const OPS_TOKEN = process.env.OPS_TOKEN;

/**
 * Area rollout configuration.
 * All areas are open (live status in locations.ts).
 */
const AREA_CONFIGS: { area: string; isOpen: boolean }[] = [
  { area: "ridderkerk", isOpen: true },
  { area: "barendrecht", isOpen: true },
  { area: "zuid", isOpen: true },
  { area: "west", isOpen: true },
  { area: "schiedam", isOpen: true },
  { area: "vlaardingen", isOpen: true },
  { area: "capelle", isOpen: true },
  { area: "maassluis", isOpen: true },
  { area: "spijkenisse", isOpen: true },
  { area: "hoogvliet", isOpen: true },
  { area: "ijsselmonde", isOpen: true },
  { area: "krimpen", isOpen: true },
  { area: "berkel", isOpen: true },
  { area: "bergschenhoek", isOpen: true },
  { area: "bleiswijk", isOpen: true },
];

/**
 * POST /api/admin/areas/seed
 *
 * Seeds area configuration items for controlled rollout.
 * Requires x-ops-token header.
 */
export async function POST(request: Request) {
  const token = request.headers.get("x-ops-token");
  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();
  const results: { area: string; status: "ok" | "error" }[] = [];

  for (const config of AREA_CONFIGS) {
    const area = normalizeArea(config.area);

    try {
      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `AREA_CONFIG#${area}`,
            SK: "CONFIG",
            type: "AREA_CONFIG",
            area,
            isOpen: config.isOpen,
            createdAt: now,
            updatedAt: now,
          },
        })
      );
      results.push({ area, status: "ok" });
    } catch (err) {
      console.error("[seed] Failed to write area config:", area, err);
      results.push({ area, status: "error" });
    }
  }

  return NextResponse.json({
    seeded: results.filter((r) => r.status === "ok").length,
    results,
  });
}
