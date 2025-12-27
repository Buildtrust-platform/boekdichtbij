const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const PLACE_DETAILS_URL = "https://places.googleapis.com/v1/places";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.internationalPhoneNumber",
  "places.websiteUri",
].join(",");

const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "internationalPhoneNumber",
  "websiteUri",
].join(",");

export interface PlaceResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  phone: string | null;
  website: string | null;
  hasWebsite: boolean;
}

interface TextSearchPlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
}

interface TextSearchResponse {
  places?: TextSearchPlace[];
}

interface PlaceDetailsResponse {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
}

export async function searchPlaces(
  niche: string,
  area: string,
  limit: number
): Promise<PlaceResult[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error("GOOGLE_PLACES_API_KEY not configured");
  }

  const query = `${niche} ${area}`;

  const response = await fetch(TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: Math.min(limit, 20),
      languageCode: "nl",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Text Search failed: ${response.status} ${error}`);
  }

  const data: TextSearchResponse = await response.json();
  const places = data.places || [];

  const results: PlaceResult[] = [];

  for (const place of places) {
    if (place.internationalPhoneNumber) {
      results.push({
        placeId: place.id,
        name: place.displayName?.text || "",
        formattedAddress: place.formattedAddress || "",
        phone: place.internationalPhoneNumber,
        website: place.websiteUri || null,
        hasWebsite: !!place.websiteUri,
      });
    } else {
      const details = await getPlaceDetails(place.id);
      if (details) {
        results.push(details);
      }
    }
  }

  return results.slice(0, limit);
}

async function getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    return null;
  }

  const response = await fetch(`${PLACE_DETAILS_URL}/${placeId}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": DETAILS_FIELD_MASK,
    },
  });

  if (!response.ok) {
    console.error(`Place Details failed for ${placeId}: ${response.status}`);
    return null;
  }

  const data: PlaceDetailsResponse = await response.json();

  return {
    placeId: data.id,
    name: data.displayName?.text || "",
    formattedAddress: data.formattedAddress || "",
    phone: data.internationalPhoneNumber || null,
    website: data.websiteUri || null,
    hasWebsite: !!data.websiteUri,
  };
}

export function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;

  let normalized = phone.replace(/[\s\-\(\)]/g, "");

  if (normalized.startsWith("0") && !normalized.startsWith("00")) {
    normalized = "+31" + normalized.slice(1);
  }

  if (!normalized.startsWith("+")) {
    return null;
  }

  return normalized;
}

export function generateProviderId(placeId: string): string {
  let hash = 0;
  for (let i = 0; i < placeId.length; i++) {
    const char = placeId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}
