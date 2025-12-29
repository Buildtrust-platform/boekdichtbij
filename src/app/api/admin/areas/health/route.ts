import { NextResponse } from "next/server";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { AREAS, getAreaDbKey } from "@/config/locations";
import { getAreaOverride } from "@/lib/areaOverrides";

const OPS_TOKEN = process.env.OPS_TOKEN;

// Readiness thresholds (LOCKED)
const HERENKAPPER_THRESHOLD = 25;
const DAMESKAPPER_THRESHOLD = 25;

interface ProviderItem {
  isActive?: boolean;
  whatsappStatus?: string;
  genderServices?: string[];
}

interface AreaCounts {
  totalProviders: number;
  activeProviders: number;
  whatsappValid: number;
  menActiveValid: number;
  womenActiveValid: number;
}

interface AreaReadiness {
  herenkapperReady: boolean;
  dameskapperReady: boolean;
  recommendedStatus: "hidden" | "pilot" | "live";
}

interface AreaHealthItem {
  areaKey: string;
  city: string;
  label: string;
  rolloutStatusDefault: "hidden" | "pilot" | "live";
  rolloutStatusEffective: "hidden" | "pilot" | "live";
  neighbors: string[];
  counts: AreaCounts;
  readiness: AreaReadiness;
}

function computeReadiness(counts: AreaCounts): AreaReadiness {
  const herenkapperReady = counts.menActiveValid >= HERENKAPPER_THRESHOLD;
  const dameskapperReady = counts.womenActiveValid >= DAMESKAPPER_THRESHOLD;

  let recommendedStatus: "hidden" | "pilot" | "live";
  if (herenkapperReady && dameskapperReady) {
    recommendedStatus = "live";
  } else if (herenkapperReady || dameskapperReady) {
    recommendedStatus = "pilot";
  } else {
    recommendedStatus = "hidden";
  }

  return { herenkapperReady, dameskapperReady, recommendedStatus };
}

export async function GET(request: Request) {
  const token = request.headers.get("x-ops-token");
  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const areas: AreaHealthItem[] = [];

    // Process all areas from rotterdam city
    for (const [areaKey, areaConfig] of Object.entries(AREAS)) {
      if (areaConfig.city !== "rotterdam") continue;

      // Convert area key to DB format (e.g., "rotterdam-zuid" -> "rotterdam_zuid")
      const dbAreaKey = getAreaDbKey(areaKey);

      // Query providers for this area via GSI2
      const result = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: "GSI2",
          KeyConditionExpression: "GSI2PK = :pk",
          ExpressionAttributeValues: {
            ":pk": `AREA#${dbAreaKey}`,
          },
          Limit: 1000,
        })
      );

      const items = (result.Items || []) as ProviderItem[];

      // Compute counts
      let totalProviders = 0;
      let activeProviders = 0;
      let whatsappValid = 0;
      let menActiveValid = 0;
      let womenActiveValid = 0;

      for (const item of items) {
        totalProviders++;

        const isActive = item.isActive ?? true;
        const whatsappStatus = item.whatsappStatus ?? "UNKNOWN";
        const genderServices = item.genderServices ?? ["men"];

        if (isActive) {
          activeProviders++;

          if (whatsappStatus === "VALID") {
            whatsappValid++;

            if (genderServices.includes("men")) {
              menActiveValid++;
            }
            if (genderServices.includes("women")) {
              womenActiveValid++;
            }
          }
        }
      }

      const counts: AreaCounts = {
        totalProviders,
        activeProviders,
        whatsappValid,
        menActiveValid,
        womenActiveValid,
      };

      const readiness = computeReadiness(counts);

      // Get override for effective status
      const override = await getAreaOverride(areaConfig.city, areaKey);
      const effectiveStatus = override?.rolloutStatus ?? areaConfig.rolloutStatus;

      areas.push({
        areaKey,
        city: areaConfig.city,
        label: areaConfig.label,
        rolloutStatusDefault: areaConfig.rolloutStatus,
        rolloutStatusEffective: effectiveStatus,
        neighbors: areaConfig.neighbors,
        counts,
        readiness,
      });
    }

    // Sort by label for consistent display
    areas.sort((a, b) => a.label.localeCompare(b.label));

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      areas,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[areas/health] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
