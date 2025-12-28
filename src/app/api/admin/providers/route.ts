import { NextResponse } from "next/server";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";

const OPS_TOKEN = process.env.OPS_TOKEN;
const VALID_AREAS = ["ridderkerk", "barendrecht", "rotterdam_zuid"];

interface ProviderItem {
  providerId: string;
  name: string;
  area: string;
  formattedAddress?: string;
  whatsappPhone: string;
  whatsappStatus?: string;
  isActive: boolean;
  hasWebsite: boolean;
  reliabilityScore: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function GET(request: Request) {
  const token = request.headers.get("x-ops-token");
  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const area = searchParams.get("area");
  const activeOnly = searchParams.get("activeOnly") === "true";
  const whatsappStatusFilter = searchParams.get("whatsappStatus");
  const hasWebsiteFilter = searchParams.get("hasWebsite");

  try {
    const providers: ProviderItem[] = [];

    const areasToQuery = area && VALID_AREAS.includes(area) ? [area] : VALID_AREAS;

    for (const a of areasToQuery) {
      const result = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: "GSI2",
          KeyConditionExpression: "GSI2PK = :pk",
          ExpressionAttributeValues: {
            ":pk": `AREA#${a}`,
          },
        })
      );

      for (const item of result.Items || []) {
        const isActive = item.isActive ?? true;
        const whatsappStatus = item.whatsappStatus ?? "UNKNOWN";
        const hasWebsite = item.hasWebsite ?? false;

        if (activeOnly && !isActive) continue;
        if (whatsappStatusFilter && whatsappStatus !== whatsappStatusFilter) continue;
        if (hasWebsiteFilter !== null && hasWebsiteFilter !== undefined) {
          const wantWebsite = hasWebsiteFilter === "true";
          if (hasWebsite !== wantWebsite) continue;
        }

        providers.push({
          providerId: item.providerId,
          name: item.name,
          area: item.area,
          formattedAddress: item.formattedAddress,
          whatsappPhone: item.whatsappPhone,
          whatsappStatus,
          isActive,
          hasWebsite,
          reliabilityScore: item.reliabilityScore ?? 0,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        });
      }
    }

    providers.sort((a, b) => b.reliabilityScore - a.reliabilityScore);

    return NextResponse.json({ providers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[providers] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
