import { NextResponse } from "next/server";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { normalizeArea } from "@/lib/area";

const OPS_TOKEN = process.env.OPS_TOKEN;

interface UpsertInput {
  area: string;
  vertical: string;
  serviceKey: string;
  isEnabled: boolean;
  priceCents: number;
  payoutCents: number;
  durationMinutes: number;
}

/**
 * POST /api/admin/services/upsert
 *
 * Create or update a service configuration.
 * Requires x-ops-token header.
 *
 * Input: { area, vertical, serviceKey, isEnabled, priceCents, payoutCents, durationMinutes }
 */
export async function POST(request: Request) {
  const token = request.headers.get("x-ops-token");
  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: UpsertInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Validate required fields
  if (!body.area || typeof body.area !== "string") {
    return NextResponse.json({ error: "area_required" }, { status: 400 });
  }
  if (!body.vertical || typeof body.vertical !== "string") {
    return NextResponse.json({ error: "vertical_required" }, { status: 400 });
  }
  if (!body.serviceKey || typeof body.serviceKey !== "string") {
    return NextResponse.json({ error: "serviceKey_required" }, { status: 400 });
  }
  if (typeof body.isEnabled !== "boolean") {
    return NextResponse.json({ error: "isEnabled_required" }, { status: 400 });
  }
  if (typeof body.priceCents !== "number" || body.priceCents < 0) {
    return NextResponse.json({ error: "priceCents_required" }, { status: 400 });
  }
  if (typeof body.payoutCents !== "number" || body.payoutCents < 0) {
    return NextResponse.json({ error: "payoutCents_required" }, { status: 400 });
  }
  if (typeof body.durationMinutes !== "number" || body.durationMinutes < 0) {
    return NextResponse.json({ error: "durationMinutes_required" }, { status: 400 });
  }

  const area = normalizeArea(body.area);
  const vertical = body.vertical.trim().toLowerCase();
  const serviceKey = body.serviceKey.trim().toLowerCase();
  const now = new Date().toISOString();

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
          isEnabled: body.isEnabled,
          priceCents: body.priceCents,
          payoutCents: body.payoutCents,
          durationMinutes: body.durationMinutes,
          updatedAt: now,
        },
      })
    );

    return NextResponse.json({
      area,
      vertical,
      serviceKey,
      isEnabled: body.isEnabled,
      priceCents: body.priceCents,
      payoutCents: body.payoutCents,
      durationMinutes: body.durationMinutes,
      updatedAt: now,
    });
  } catch (err) {
    console.error("[upsert-service] Failed to upsert service config:", area, vertical, serviceKey, err);
    return NextResponse.json({ error: "upsert_failed" }, { status: 500 });
  }
}
