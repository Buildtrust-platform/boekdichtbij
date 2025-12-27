import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/googlePlaces";

const OPS_TOKEN = process.env.OPS_TOKEN;
const VALID_AREAS = ["ridderkerk", "barendrecht", "rotterdam_zuid"];

interface ImportPreviewInput {
  area: string;
  niche: string;
  limit?: number;
}

function validateInput(body: unknown): body is ImportPreviewInput {
  if (!body || typeof body !== "object") return false;
  const obj = body as Record<string, unknown>;
  if (typeof obj.area !== "string" || !VALID_AREAS.includes(obj.area)) return false;
  if (typeof obj.niche !== "string" || obj.niche.length === 0) return false;
  if (obj.limit !== undefined && (typeof obj.limit !== "number" || obj.limit < 1)) return false;
  return true;
}

export async function POST(request: Request) {
  const token = request.headers.get("x-ops-token");
  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return new NextResponse("Not Found", { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!validateInput(body)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { area, niche, limit = 20 } = body;

  try {
    const places = await searchPlaces(niche, area, limit);

    return NextResponse.json({
      area,
      niche,
      count: places.length,
      places,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[import-preview] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
