import { NextResponse } from "next/server";
import { listEnabledServices } from "@/lib/serviceConfig";
import { normalizeArea } from "@/lib/area";

/**
 * GET /api/services
 *
 * Public endpoint to list enabled services for an area + vertical.
 * Used by booking pages to show available services.
 *
 * Query params:
 *   area (required) - Area key to query
 *   vertical (required) - Vertical key to query (e.g., "schoonmaak", "kapper")
 */
export async function GET(request: Request) {
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
    const services = await listEnabledServices(normalizedArea, normalizedVertical);

    return NextResponse.json({
      area: normalizedArea,
      vertical: normalizedVertical,
      services: services.map((s) => ({
        serviceKey: s.serviceKey,
        priceCents: s.priceCents,
        payoutCents: s.payoutCents,
        durationMinutes: s.durationMinutes,
      })),
    });
  } catch (err) {
    console.error("[services] Failed to list services:", err);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }
}
