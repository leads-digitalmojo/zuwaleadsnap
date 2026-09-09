/**
 * Google Places API (New) — business resolution.
 * Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
 */

import axios, { AxiosError } from "axios";

const PLACES_BASE = "https://places.googleapis.com/v1";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
].join(",");

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlacesTextSearchResponse {
  places?: Array<{
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    rating?: number;
    userRatingCount?: number;
  }>;
}

export interface ResolvedBusiness {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  reviewCount: number | null;
}

// ─── Resolver ─────────────────────────────────────────────────────────────────

/**
 * Resolve a business name to a stable Google Place ID.
 * Biases the search toward (lat, lng) if provided.
 * Returns null if no result is found or the API key is not configured.
 */
export async function resolveBusiness(
  businessName: string,
  lat?: number,
  lng?: number
): Promise<ResolvedBusiness | null> {
  const apiKey = process.env["GOOGLE_PLACES_API_KEY"];
  if (!apiKey || apiKey === "your_google_places_api_key") {
    return null; // caller will fall back to name-only matching
  }

  const body: Record<string, unknown> = {
    textQuery: businessName,
    maxResultCount: 1,
  };

  if (lat != null && lng != null) {
    body["locationBias"] = {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: 50_000, // 50 km — wide enough to handle grid centers
      },
    };
  }

  let response: PlacesTextSearchResponse;
  try {
    const res = await axios.post<PlacesTextSearchResponse>(
      `${PLACES_BASE}/places:searchText`,
      body,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
          "Content-Type": "application/json",
        },
        timeout: 10_000,
      }
    );
    response = res.data;
  } catch (err) {
    if (err instanceof AxiosError && err.response) {
      throw new Error(
        `Google Places API error [${err.response.status}]: ${JSON.stringify(err.response.data)}`
      );
    }
    throw new Error(`Google Places request failed: ${(err as Error).message}`);
  }

  const place = response.places?.[0];
  if (!place) return null;

  return {
    placeId: place.id,
    name: place.displayName?.text ?? businessName,
    address: place.formattedAddress ?? "",
    lat: place.location?.latitude ?? lat ?? 0,
    lng: place.location?.longitude ?? lng ?? 0,
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? null,
  };
}
