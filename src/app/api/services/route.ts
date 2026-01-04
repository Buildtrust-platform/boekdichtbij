import { NextResponse } from "next/server";
import { listEnabledServices } from "@/lib/serviceConfig";

/**
 * GET /api/services
 *
 * Public endpoint to fetch enabled services for an area + vertical.
 * Used by booking pages to display available services.
 *
 * Query params:
 *   area (required) - Area slug (e.g., "rotterdam-zuid")
 *   vertical (required) - Vertical slug (e.g., "schoonmaak")
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

  try {
    const services = await listEnabledServices(area, vertical);

    return NextResponse.json({
      area,
      vertical,
      services: services.map((s) => ({
        serviceKey: s.serviceKey,
        priceCents: s.priceCents,
        payoutCents: s.payoutCents,
        durationMinutes: s.durationMinutes,
      })),
    });
  } catch (err) {
    console.error("[api/services] Failed to fetch services:", err);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}
