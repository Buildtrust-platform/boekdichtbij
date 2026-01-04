import { NextResponse } from "next/server";
import { PutCommand, BatchWriteCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { normalizeArea } from "@/lib/area";

const OPS_TOKEN = process.env.OPS_TOKEN;

interface AreaConfigInput {
  areaSlug: string;
  areaLabel: string;
  citySlug: string;
  isOpen: boolean;
  enabledVerticals: string[];
}

interface ServiceInput {
  serviceKey: string;
  name: string;
  description: string;
  priceCents: number;
  payoutCents: number;
  durationMinutes: number;
  isEnabled: boolean;
}

interface SeedRequest {
  action: "area" | "services" | "delete-service";
  // For area action
  areaConfig?: AreaConfigInput;
  // For services action
  area?: string;
  vertical?: string;
  services?: ServiceInput[];
  // For delete-service action
  serviceKey?: string;
}

/**
 * POST /api/ops/seed
 *
 * Seeds AREA_CONFIG or SERVICE_CONFIG items.
 * Requires x-ops-token header.
 *
 * Body for area action:
 * {
 *   "action": "area",
 *   "areaConfig": {
 *     "areaSlug": "rotterdam-zuid",
 *     "areaLabel": "Rotterdam-Zuid",
 *     "citySlug": "rotterdam",
 *     "isOpen": false,
 *     "enabledVerticals": []
 *   }
 * }
 *
 * Body for services action:
 * {
 *   "action": "services",
 *   "area": "rotterdam-zuid",
 *   "vertical": "herenkapper",
 *   "services": [
 *     { "serviceKey": "heren-standaard", "name": "Standaard knipbeurt", ... }
 *   ]
 * }
 */
export async function POST(request: Request) {
  const token = request.headers.get("x-ops-token");
  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: SeedRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { action } = body;

  if (action === "area") {
    return seedAreaConfig(body.areaConfig);
  } else if (action === "services") {
    return seedServices(body.area, body.vertical, body.services);
  } else if (action === "delete-service") {
    return deleteService(body.area, body.vertical, body.serviceKey);
  } else {
    return NextResponse.json(
      { error: "invalid_action", message: "action must be 'area', 'services', or 'delete-service'" },
      { status: 400 }
    );
  }
}

async function seedAreaConfig(config: AreaConfigInput | undefined) {
  if (!config) {
    return NextResponse.json({ error: "areaConfig_required" }, { status: 400 });
  }

  const { areaSlug, areaLabel, citySlug, isOpen, enabledVerticals } = config;

  if (!areaSlug || !areaLabel || !citySlug) {
    return NextResponse.json(
      { error: "missing_fields", message: "areaSlug, areaLabel, citySlug required" },
      { status: 400 }
    );
  }

  const normalizedArea = normalizeArea(areaSlug);
  const now = new Date().toISOString();

  try {
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: "AREA_CONFIG",
          SK: `AREA#${normalizedArea}`,
          areaSlug: normalizedArea,
          areaLabel,
          citySlug,
          isOpen: isOpen ?? false,
          enabledVerticals: enabledVerticals ?? [],
          createdAt: now,
          updatedAt: now,
        },
      })
    );

    return NextResponse.json({
      success: true,
      action: "area",
      areaSlug: normalizedArea,
      isOpen: isOpen ?? false,
      enabledVerticals: enabledVerticals ?? [],
    });
  } catch (err) {
    console.error("[ops-seed] Failed to seed area config:", err);
    return NextResponse.json({ error: "seed_failed" }, { status: 500 });
  }
}

async function seedServices(
  area: string | undefined,
  vertical: string | undefined,
  services: ServiceInput[] | undefined
) {
  if (!area || !vertical) {
    return NextResponse.json(
      { error: "missing_fields", message: "area and vertical required" },
      { status: 400 }
    );
  }

  if (!services || services.length === 0) {
    return NextResponse.json(
      { error: "no_services", message: "services array required" },
      { status: 400 }
    );
  }

  const normalizedArea = normalizeArea(area);
  const normalizedVertical = vertical.trim().toLowerCase();
  const now = new Date().toISOString();

  // Build items for batch write
  const items = services.map((s) => ({
    PutRequest: {
      Item: {
        PK: `SERVICE_CONFIG#AREA#${normalizedArea}#VERTICAL#${normalizedVertical}`,
        SK: `SERVICE#${s.serviceKey.trim().toLowerCase()}`,
        area: normalizedArea,
        vertical: normalizedVertical,
        serviceKey: s.serviceKey.trim().toLowerCase(),
        name: s.name,
        description: s.description,
        priceCents: s.priceCents,
        payoutCents: s.payoutCents,
        durationMinutes: s.durationMinutes,
        isEnabled: s.isEnabled ?? true,
        createdAt: now,
        updatedAt: now,
      },
    },
  }));

  try {
    // DynamoDB batch write limit is 25 items
    const batches = [];
    for (let i = 0; i < items.length; i += 25) {
      batches.push(items.slice(i, i + 25));
    }

    for (const batch of batches) {
      await ddb.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: batch,
          },
        })
      );
    }

    return NextResponse.json({
      success: true,
      action: "services",
      area: normalizedArea,
      vertical: normalizedVertical,
      count: services.length,
      services: services.map((s) => s.serviceKey),
    });
  } catch (err) {
    console.error("[ops-seed] Failed to seed services:", err);
    return NextResponse.json({ error: "seed_failed" }, { status: 500 });
  }
}

async function deleteService(
  area: string | undefined,
  vertical: string | undefined,
  serviceKey: string | undefined
) {
  if (!area || !vertical || !serviceKey) {
    return NextResponse.json(
      { error: "missing_fields", message: "area, vertical, and serviceKey required" },
      { status: 400 }
    );
  }

  const normalizedArea = normalizeArea(area);
  const normalizedVertical = vertical.trim().toLowerCase();
  const normalizedServiceKey = serviceKey.trim().toLowerCase();

  try {
    await ddb.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `SERVICE_CONFIG#AREA#${normalizedArea}#VERTICAL#${normalizedVertical}`,
          SK: `SERVICE#${normalizedServiceKey}`,
        },
      })
    );

    return NextResponse.json({
      success: true,
      action: "delete-service",
      area: normalizedArea,
      vertical: normalizedVertical,
      serviceKey: normalizedServiceKey,
    });
  } catch (err) {
    console.error("[ops-seed] Failed to delete service:", err);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
