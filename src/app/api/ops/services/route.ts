import { NextResponse } from "next/server";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { normalizeArea } from "@/lib/area";
import type { ServiceConfigItem } from "@/lib/serviceConfig";

const OPS_TOKEN = process.env.OPS_TOKEN;

/**
 * GET /api/ops/services
 *
 * Returns service configurations for an area + vertical.
 * Requires x-ops-token header.
 *
 * Query params:
 *   area (required) - Area key to query
 *   vertical (required) - Vertical key to query (e.g., "schoonmaak", "kapper")
 */
export async function GET(request: Request) {
  const token = request.headers.get("x-ops-token");
  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const area = searchParams.get("area");
  const vertical = searchParams.get("vertical");

  if (!area) {
    return NextResponse.json({ error: "area_required" }, { status: 400 });
  }
  if (!vertical) {
    return NextResponse.json({ error: "vertical_required" }, { status: 400 });
  }

  const normalizedArea = normalizeArea(area);
  const normalizedVertical = vertical.trim().toLowerCase();

  try {
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

    const services = (result.Items || []) as ServiceConfigItem[];

    // Compute summary stats
    const enabled = services.filter((s) => s.isEnabled === true);
    const disabled = services.filter((s) => s.isEnabled === false);

    return NextResponse.json({
      area: normalizedArea,
      vertical: normalizedVertical,
      counts: {
        total: services.length,
        enabled: enabled.length,
        disabled: disabled.length,
      },
      services: services.map((s) => ({
        serviceKey: s.serviceKey,
        isEnabled: s.isEnabled,
        priceCents: s.priceCents,
        payoutCents: s.payoutCents,
        durationMinutes: s.durationMinutes,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (err) {
    console.error("[ops-services] Failed to query services:", err);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }
}
