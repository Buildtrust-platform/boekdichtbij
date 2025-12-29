import { NextResponse } from "next/server";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { normalizeArea } from "@/lib/area";

const OPS_TOKEN = process.env.OPS_TOKEN;

interface ToggleInput {
  area: string;
  isOpen: boolean;
}

/**
 * POST /api/admin/areas/toggle
 *
 * Toggle an area's isOpen status.
 * Requires x-ops-token header.
 *
 * Input: { area: string, isOpen: boolean }
 */
export async function POST(request: Request) {
  const token = request.headers.get("x-ops-token");
  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: ToggleInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.area || typeof body.area !== "string") {
    return NextResponse.json({ error: "area_required" }, { status: 400 });
  }

  if (typeof body.isOpen !== "boolean") {
    return NextResponse.json({ error: "isOpen_required" }, { status: 400 });
  }

  const area = normalizeArea(body.area);
  const now = new Date().toISOString();

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `AREA_CONFIG#${area}`, SK: "CONFIG" },
        UpdateExpression: "SET isOpen = :isOpen, updatedAt = :now",
        ConditionExpression: "attribute_exists(PK)",
        ExpressionAttributeValues: {
          ":isOpen": body.isOpen,
          ":now": now,
        },
      })
    );

    return NextResponse.json({
      area,
      isOpen: body.isOpen,
      updatedAt: now,
    });
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      console.log("[toggle] Area not found (not seeded):", area);
      return NextResponse.json({ error: "area_not_found" }, { status: 404 });
    }
    console.error("[toggle] Failed to update area config:", area, err);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
