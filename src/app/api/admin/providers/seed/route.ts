import { NextResponse } from "next/server";
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";

const OPS_TOKEN = process.env.OPS_TOKEN;

const SEED_PROVIDERS = [
  {
    providerId: "seed-provider-001",
    name: "Test Kapper Jan",
    area: "ridderkerk",
    whatsappPhone: "+31600000001",
    isActive: true,
    reliabilityScore: 95,
  },
  {
    providerId: "seed-provider-002",
    name: "Test Kapper Piet",
    area: "ridderkerk",
    whatsappPhone: "+31600000002",
    isActive: true,
    reliabilityScore: 90,
  },
  {
    providerId: "seed-provider-003",
    name: "Test Kapper Kees",
    area: "ridderkerk",
    whatsappPhone: "+31600000003",
    isActive: true,
    reliabilityScore: 85,
  },
  {
    providerId: "seed-provider-004",
    name: "Test Kapper Willem",
    area: "ridderkerk",
    whatsappPhone: "+31600000004",
    isActive: true,
    reliabilityScore: 80,
  },
  {
    providerId: "seed-provider-005",
    name: "Test Kapper Henk",
    area: "ridderkerk",
    whatsappPhone: "+31600000005",
    isActive: false,
    reliabilityScore: 75,
  },
  {
    providerId: "seed-provider-006",
    name: "Test Kapper Dirk",
    area: "ridderkerk",
    whatsappPhone: "+31600000006",
    isActive: true,
    reliabilityScore: 70,
  },
];

function invertedScore(score: number): string {
  // 4-digit inverted score so higher scores sort first with ScanIndexForward=true
  const inverted = 9999 - score;
  return String(inverted).padStart(4, "0");
}

export async function POST(request: Request) {
  const token = request.headers.get("x-ops-token");
  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const results: Array<{
    providerId: string;
    name: string;
    status: "created" | "exists";
  }> = [];

  const now = new Date().toISOString();

  for (const p of SEED_PROVIDERS) {
    // Check if provider already exists
    const existing = await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `PROVIDER#${p.providerId}`, SK: "PROFILE" },
      })
    );

    if (existing.Item) {
      results.push({ providerId: p.providerId, name: p.name, status: "exists" });

      // Still ensure phone mapping exists
      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `PHONE#${p.whatsappPhone}`,
            SK: "PROVIDER",
            type: "PHONE_MAP",
            providerId: p.providerId,
            createdAt: now,
          },
        })
      );

      continue;
    }

    // Create new provider with exact shape from spec
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `PROVIDER#${p.providerId}`,
          SK: "PROFILE",
          type: "PROVIDER",
          providerId: p.providerId,
          name: p.name,
          area: p.area,
          whatsappPhone: p.whatsappPhone,
          isActive: p.isActive,
          reliabilityScore: p.reliabilityScore,
          createdAt: now,
          updatedAt: now,
          // GSI2 for area queries with inverted score for proper ordering
          GSI2PK: `AREA#${p.area}`,
          GSI2SK: `SCORE#${invertedScore(p.reliabilityScore)}#PROVIDER#${p.providerId}`,
        },
      })
    );

    // Create phone mapping item for inbound webhook lookup
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `PHONE#${p.whatsappPhone}`,
          SK: "PROVIDER",
          type: "PHONE_MAP",
          providerId: p.providerId,
          createdAt: now,
        },
      })
    );

    results.push({ providerId: p.providerId, name: p.name, status: "created" });
  }

  return NextResponse.json({
    seeded: results.filter((r) => r.status === "created").length,
    skipped: results.filter((r) => r.status === "exists").length,
    results,
  });
}
