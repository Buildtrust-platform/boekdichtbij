import { NextResponse } from "next/server";
import { QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import {
  searchPlaces,
  normalizePhone,
  generateProviderId,
  PlaceResult,
} from "@/lib/googlePlaces";

const OPS_TOKEN = process.env.OPS_TOKEN;
const VALID_AREAS = ["ridderkerk", "barendrecht", "rotterdam_zuid"];

interface ImportInput {
  area: string;
  niche: string;
  limit?: number;
}

function validateInput(body: unknown): body is ImportInput {
  if (!body || typeof body !== "object") return false;
  const obj = body as Record<string, unknown>;
  if (typeof obj.area !== "string" || !VALID_AREAS.includes(obj.area)) return false;
  if (typeof obj.niche !== "string" || obj.niche.length === 0) return false;
  if (obj.limit !== undefined && (typeof obj.limit !== "number" || obj.limit < 1)) return false;
  return true;
}

async function placeExists(placeId: string): Promise<boolean> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI3",
      KeyConditionExpression: "GSI3PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `PLACE#${placeId}`,
      },
      Limit: 1,
    })
  );
  return (result.Items?.length ?? 0) > 0;
}

async function phoneExists(phone: string): Promise<boolean> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI3",
      KeyConditionExpression: "GSI3PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `PHONE#${phone}`,
      },
      Limit: 1,
    })
  );
  return (result.Items?.length ?? 0) > 0;
}

function padScore(score: number): string {
  return score.toString().padStart(4, "0");
}

async function createProvider(place: PlaceResult, area: string, phone: string): Promise<void> {
  const providerId = generateProviderId(place.placeId);
  const now = new Date().toISOString();
  const reliabilityScore = 0;

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `PROVIDER#${providerId}`,
        SK: "PROVIDER",
        type: "PROVIDER",
        providerId,
        name: place.name,
        whatsappPhone: phone,
        area,
        isActive: true,
        reliabilityScore,
        hasWebsite: place.hasWebsite,
        website: place.website,
        placeId: place.placeId,
        formattedAddress: place.formattedAddress,
        createdAt: now,
        updatedAt: now,
        GSI2PK: `AREA#${area}`,
        GSI2SK: `SCORE#${padScore(reliabilityScore)}#PROVIDER#${providerId}`,
        GSI3PK: `PLACE#${place.placeId}`,
        GSI3SK: `PROVIDER#${providerId}`,
      },
    })
  );

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `PHONE#${phone}`,
        SK: `PROVIDER#${providerId}`,
        type: "PHONE_INDEX",
        providerId,
        GSI3PK: `PHONE#${phone}`,
        GSI3SK: `PROVIDER#${providerId}`,
      },
    })
  );
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

    let inserted = 0;
    let skippedExisting = 0;
    let skippedNoPhone = 0;
    let skippedDuplicatePhone = 0;
    const insertedProviders: { providerId: string; name: string; phone: string }[] = [];

    for (const place of places) {
      const phone = normalizePhone(place.phone);

      if (!phone) {
        skippedNoPhone++;
        continue;
      }

      const exists = await placeExists(place.placeId);
      if (exists) {
        skippedExisting++;
        continue;
      }

      const phoneDupe = await phoneExists(phone);
      if (phoneDupe) {
        skippedDuplicatePhone++;
        continue;
      }

      await createProvider(place, area, phone);
      inserted++;
      insertedProviders.push({
        providerId: generateProviderId(place.placeId),
        name: place.name,
        phone,
      });
    }

    return NextResponse.json({
      area,
      niche,
      summary: {
        inserted,
        skipped_existing: skippedExisting,
        skipped_no_phone: skippedNoPhone,
        skipped_duplicate_phone: skippedDuplicatePhone,
      },
      insertedProviders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[import] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
