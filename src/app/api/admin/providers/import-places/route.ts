import { NextResponse } from "next/server";
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "@/lib/ddb";
import { sendWhatsApp } from "@/lib/twilio";
import { COPY } from "@/lib/copy";

const OPS_TOKEN = process.env.OPS_TOKEN;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://boekdichtbij.nl";

interface PlaceSearchResult {
  places?: Array<{
    id: string;
    displayName?: { text: string };
    formattedAddress?: string;
    internationalPhoneNumber?: string;
    nationalPhoneNumber?: string;
    websiteUri?: string;
    businessStatus?: string;
  }>;
}

interface LeadResult {
  placeId: string;
  providerId?: string;
  invited: boolean;
  error?: string;
}

function invertedScore(score: number): string {
  const inverted = 9999 - score;
  return String(inverted).padStart(4, "0");
}

function normalizePhoneToE164(phone: string): string | null {
  if (!phone) return null;

  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, "");

  // Handle Dutch numbers
  if (cleaned.startsWith("0")) {
    // Dutch local format: 06xxxxxxxx -> +316xxxxxxxx
    cleaned = "+31" + cleaned.slice(1);
  } else if (cleaned.startsWith("31") && !cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  } else if (!cleaned.startsWith("+")) {
    // Assume Dutch if no country code
    cleaned = "+31" + cleaned;
  }

  // Basic validation: must start with + and have at least 10 digits
  if (!cleaned.startsWith("+") || cleaned.length < 11) {
    return null;
  }

  return cleaned;
}

function generateInviteCode(): string {
  // 8-character alphanumeric code
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function deriveProviderId(placeId: string): string {
  // Stable provider ID from place ID
  return `place-${placeId.slice(0, 24)}`;
}

export async function POST(request: Request) {
  // Auth check
  const token = request.headers.get("x-ops-token");
  if (!OPS_TOKEN || token !== OPS_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!GOOGLE_PLACES_API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY not configured" },
      { status: 500 }
    );
  }

  // Parse input
  let body: { query: string; area: string; vertical?: string; limit?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { query, area, vertical = "herenkapper", limit = 10 } = body;

  if (!query || !area) {
    return NextResponse.json(
      { error: "query and area are required" },
      { status: 400 }
    );
  }

  const normalizedArea = area.trim().toLowerCase();
  const maxResults = Math.min(limit, 20);

  // Step 1: Text Search to get place IDs
  const searchUrl = "https://places.googleapis.com/v1/places:searchText";
  const searchResponse = await fetch(searchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.nationalPhoneNumber,places.websiteUri,places.businessStatus",
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: maxResults,
      languageCode: "nl",
    }),
  });

  if (!searchResponse.ok) {
    const errorText = await searchResponse.text();
    console.error("[import-places] Google Places API error:", errorText);
    return NextResponse.json(
      { error: "places_api_error", details: errorText },
      { status: 502 }
    );
  }

  const searchData: PlaceSearchResult = await searchResponse.json();
  const places = searchData.places || [];

  if (places.length === 0) {
    return NextResponse.json({
      imported: 0,
      invited: 0,
      leads: [],
    });
  }

  const now = new Date().toISOString();
  const leads: LeadResult[] = [];
  let importedCount = 0;
  let invitedCount = 0;

  for (const place of places) {
    const placeId = place.id;
    const name = place.displayName?.text || "Unknown";
    const address = place.formattedAddress || "";
    const rawPhone =
      place.internationalPhoneNumber || place.nationalPhoneNumber || "";
    const website = place.websiteUri || "";
    const businessStatus = place.businessStatus || "OPERATIONAL";

    const leadResult: LeadResult = {
      placeId,
      invited: false,
    };

    try {
      // Write LEAD item
      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `LEAD#PLACE#${placeId}`,
            SK: "LEAD",
            type: "LEAD",
            placeId,
            area: normalizedArea,
            name,
            address,
            phone: rawPhone,
            website,
            businessStatus,
            importedAt: now,
          },
        })
      );

      importedCount++;

      // If phone exists, create provider + invite
      const normalizedPhone = normalizePhoneToE164(rawPhone);
      if (normalizedPhone) {
        const providerId = deriveProviderId(placeId);
        leadResult.providerId = providerId;

        // Check if provider already exists
        const existingProvider = await ddb.send(
          new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `PROVIDER#${providerId}`, SK: "PROFILE" },
          })
        );

        if (!existingProvider.Item) {
          // Create PROVIDER record (inactive by default)
          await ddb.send(
            new PutCommand({
              TableName: TABLE_NAME,
              Item: {
                PK: `PROVIDER#${providerId}`,
                SK: "PROFILE",
                type: "PROVIDER",
                providerId,
                placeId,
                name,
                area: normalizedArea,
                vertical,
                whatsappPhone: normalizedPhone,
                isActive: false,
                hasWebsite: !!website,
                reliabilityScore: 50,
                createdAt: now,
                updatedAt: now,
                GSI2PK: `AREA#${normalizedArea}`,
                GSI2SK: `SCORE#${invertedScore(50)}#PROVIDER#${providerId}`,
              },
            })
          );

          // Create PHONE mapping
          await ddb.send(
            new PutCommand({
              TableName: TABLE_NAME,
              Item: {
                PK: `PHONE#${normalizedPhone}`,
                SK: "PROVIDER",
                type: "PHONE_MAP",
                providerId,
                createdAt: now,
              },
            })
          );

          // Create INVITE
          const inviteCode = generateInviteCode();
          await ddb.send(
            new PutCommand({
              TableName: TABLE_NAME,
              Item: {
                PK: `INVITE#${inviteCode}`,
                SK: "INVITE",
                type: "INVITE",
                inviteCode,
                providerId,
                phone: normalizedPhone,
                createdAt: now,
                status: "SENT",
              },
            })
          );

          // Send WhatsApp invite
          const claimUrl = `${APP_URL}/provider/claim/${inviteCode}`;
          const message = `${COPY.providerInvite.intro}\n\n${COPY.providerInvite.instruction}\n${claimUrl}`;

          try {
            await sendWhatsApp(normalizedPhone, message);
            leadResult.invited = true;
            invitedCount++;
          } catch (whatsappError) {
            console.error(
              "[import-places] WhatsApp send failed:",
              providerId,
              whatsappError
            );
            leadResult.error = "whatsapp_failed";
          }
        } else {
          // Provider already exists, skip invite
          leadResult.error = "provider_exists";
        }
      }

      leads.push(leadResult);
    } catch (err) {
      console.error("[import-places] Error processing place:", placeId, err);
      leadResult.error = "processing_error";
      leads.push(leadResult);
    }
  }

  return NextResponse.json({
    imported: importedCount,
    invited: invitedCount,
    leads,
  });
}
