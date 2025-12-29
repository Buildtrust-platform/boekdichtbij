import { NextResponse } from "next/server";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { normalizeArea } from "@/lib/area";

const OPS_TOKEN = process.env.OPS_TOKEN;

/**
 * Area rollout configuration.
 * Only ridderkerk is open initially.
 */
const AREA_CONFIGS: { area: string; isOpen: boolean }[] = [
  { area: "ridderkerk", isOpen: true },
  { area: "rotterdam-centrum", isOpen: false },
  { area: "rotterdam-zuid", isOpen: false },
  { area: "rotterdam-west", isOpen: false },
  { area: "schiedam", isOpen: false },
  { area: "capelle-aan-den-ijssel", isOpen: false },
  { area: "barendrecht", isOpen: false },
  { area: "vlaardingen", isOpen: false },
  { area: "hoogvliet", isOpen: false },
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
