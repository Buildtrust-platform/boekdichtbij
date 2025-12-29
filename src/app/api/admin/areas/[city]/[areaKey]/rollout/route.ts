import { NextResponse } from "next/server";
import { AREAS } from "@/config/locations";
import { getAreaOverride, setAreaOverride } from "@/lib/areaOverrides";

const OPS_TOKEN = process.env.OPS_TOKEN;

interface RouteParams {
  params: Promise<{
    city: string;
    areaKey: string;
  }>;
}

const VALID_STATUSES = ["hidden", "pilot", "live"] as const;
type RolloutStatus = (typeof VALID_STATUSES)[number];

function isValidStatus(status: unknown): status is RolloutStatus {
  return (
    typeof status === "string" &&
    VALID_STATUSES.includes(status as RolloutStatus)
  );
}

export async function POST(request: Request, { params }: RouteParams) {
  const token = request.headers.get("x-ops-token");
  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const { city, areaKey } = await params;

  // Validate city and areaKey exist in registry
  const areaConfig = AREAS[areaKey];
  if (!areaConfig) {
    return NextResponse.json({ error: "Area not found" }, { status: 400 });
  }

  if (areaConfig.city !== city) {
    return NextResponse.json({ error: "City mismatch" }, { status: 400 });
  }

  // Parse and validate input
  let body: { rolloutStatus?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isValidStatus(body.rolloutStatus)) {
    return NextResponse.json(
      { error: "Invalid rolloutStatus. Must be: hidden, pilot, or live" },
      { status: 400 }
    );
  }

  // Get current effective status for audit
  const currentOverride = await getAreaOverride(city, areaKey);
  const previousStatus = currentOverride?.rolloutStatus ?? areaConfig.rolloutStatus;

  // Set the override
  try {
    await setAreaOverride(city, areaKey, { rolloutStatus: body.rolloutStatus }, previousStatus);
  } catch (err) {
    console.error("[rollout] setAreaOverride error:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    city,
    areaKey,
    rolloutStatus: body.rolloutStatus,
  });
}
