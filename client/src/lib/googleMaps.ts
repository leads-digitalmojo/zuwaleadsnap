import { Loader } from "@googlemaps/js-api-loader";

let cachedKey: string | null = null;
let loaderSingleton: Loader | null = null;

/**
 * Retrieve Google Maps JS API key from environment variable or backend config endpoint.
 * Never hardcode API keys in source files.
 */
export async function getGoogleMapsKey(): Promise<string> {
  if (cachedKey) return cachedKey;

  const envKey = (import.meta.env["VITE_GOOGLE_MAPS_JS_API_KEY"] as string | undefined)?.trim();
  if (envKey) {
    cachedKey = envKey;
    return envKey;
  }

  try {
    const res = await fetch("/api/config/maps-key");
    if (res.ok) {
      const data = await res.json() as { key?: string };
      if (data?.key) {
        cachedKey = data.key.trim();
        return cachedKey;
      }
    }
  } catch {
    // ignore network/fetch error
  }

  return "";
}

/**
 * Safely loads Google Maps libraries. Reuses window.google.maps if already initialized.
 */
export async function loadGoogleMapsLibraries(): Promise<{
  Map: typeof google.maps.Map;
  AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
}> {
  if (
    typeof window !== "undefined" &&
    window.google &&
    window.google.maps &&
    window.google.maps.Map &&
    window.google.maps.marker &&
    window.google.maps.marker.AdvancedMarkerElement
  ) {
    return {
      Map: window.google.maps.Map,
      AdvancedMarkerElement: window.google.maps.marker.AdvancedMarkerElement,
    };
  }

  const apiKey = await getGoogleMapsKey();
  if (!apiKey) {
    throw new Error("Google Maps API key not configured. Set GOOGLE_MAPS_JS_API_KEY.");
  }

  if (!loaderSingleton) {
    loaderSingleton = new Loader({
      apiKey,
      version: "weekly",
      libraries: ["maps", "marker"],
    });
  }

  const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
    loaderSingleton.importLibrary("maps") as Promise<{ Map: typeof google.maps.Map }>,
    loaderSingleton.importLibrary("marker") as Promise<{ AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement }>,
  ]);

  return { Map, AdvancedMarkerElement };
}
