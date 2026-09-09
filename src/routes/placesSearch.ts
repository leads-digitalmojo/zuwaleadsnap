import type { Request, Response } from "express";
import axios, { AxiosError } from "axios";
import { logCost, GOOGLE_PLACES_RATE_KNOWN, GOOGLE_PLACES_RATE_NOTE } from "../lib/costLogger.js";

interface GooglePlaceResult {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
}

interface GooglePlacesResponse {
  places?: GooglePlaceResult[];
}

export async function placesSearchHandler(req: Request, res: Response): Promise<void> {
  const q = typeof req.query["q"] === "string" ? req.query["q"].trim() : "";
  const latStr = typeof req.query["lat"] === "string" ? req.query["lat"] : "";
  const lngStr = typeof req.query["lng"] === "string" ? req.query["lng"] : "";

  if (!q) {
    res.status(400).json({ error: "q: required non-empty query string" });
    return;
  }

  const apiKey = process.env["GOOGLE_PLACES_API_KEY"];
  if (!apiKey || apiKey === "your_google_places_api_key") {
    // Key not configured — return empty list so frontend degrades gracefully
    res.json({ places: [] });
    return;
  }

  const body: Record<string, unknown> = {
    textQuery: q,
    maxResultCount: 5,
  };

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (!isNaN(lat) && !isNaN(lng)) {
    body["locationBias"] = {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: 50000,
      },
    };
  }

  try {
    const response = await axios.post<GooglePlacesResponse>(
      "https://places.googleapis.com/v1/places:searchText",
      body,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress," +
            "places.location,places.rating,places.userRatingCount",
          "Content-Type": "application/json",
        },
        timeout: 10_000,
      }
    );

    const places = (response.data.places ?? []).map((p) => ({
      placeId: p.id ?? "",
      name: p.displayName?.text ?? "",
      address: p.formattedAddress ?? "",
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      rating: p.rating ?? null,
      reviewCount: p.userRatingCount ?? null,
    }));

    logCost({
      vendor: "google_places",
      callType: "places_search_text",
      costUsd: 0,
      cacheHit: false,
      meta: { query: q, resultCount: places.length, rateKnown: GOOGLE_PLACES_RATE_KNOWN, rateNote: GOOGLE_PLACES_RATE_NOTE },
    });

    res.json({ places });
  } catch (err) {
    const msg = err instanceof AxiosError ? err.message : String(err);
    res.status(502).json({ error: `Places API error: ${msg}` });
  }
}
