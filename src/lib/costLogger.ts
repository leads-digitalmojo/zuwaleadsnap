import { getDb } from "./db.js";

export type Vendor = "dataforseo_serp" | "dataforseo_kw" | "google_places" | "anthropic";

export interface CostEntry {
  vendor: Vendor;
  callType: string;
  costUsd: number;
  cacheHit: boolean;
  meta?: Record<string, unknown>;
}

export function logCost(entry: CostEntry): void {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO api_cost_log (vendor, call_type, cost_usd, cache_hit, meta)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      entry.vendor,
      entry.callType,
      entry.costUsd,
      entry.cacheHit ? 1 : 0,
      entry.meta ? JSON.stringify(entry.meta) : null
    );
  } catch (err) {
    // Never let cost logging crash a request
    console.error("[costLogger] failed to log:", (err as Error).message);
  }
}

// ─── Anthropic token pricing ──────────────────────────────────────────────────
// Source: claude-api skill documentation, cached 2026-06-04.
// These rates may change — treat as best-known-at-build-time.
// Rate: claude-haiku-4-5 = $1.00 input / $5.00 output per 1M tokens.
// If the configured model is not in this table, we return null to signal
// that the cost is unknown rather than silently logging a wrong number.
const ANTHROPIC_RATES: Record<string, { inputPer1M: number; outputPer1M: number; rateSource: string }> = {
  "claude-haiku-4-5": { inputPer1M: 1.00, outputPer1M: 5.00, rateSource: "claude-api-skill-2026-06-04" },
  "claude-haiku-4-5-20251001": { inputPer1M: 1.00, outputPer1M: 5.00, rateSource: "claude-api-skill-2026-06-04" },
  "claude-sonnet-4-6": { inputPer1M: 3.00, outputPer1M: 15.00, rateSource: "claude-api-skill-2026-06-04" },
  "claude-opus-4-8": { inputPer1M: 5.00, outputPer1M: 25.00, rateSource: "claude-api-skill-2026-06-04" },
};

export interface AnthropicTokenCost {
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
  rateKnown: boolean;
  rateSource: string | null;
}

export function calcAnthropicCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): AnthropicTokenCost {
  const rate = ANTHROPIC_RATES[model];
  if (!rate) {
    return {
      costUsd: 0,
      inputTokens,
      outputTokens,
      model,
      rateKnown: false,
      rateSource: null,
    };
  }
  const costUsd =
    (inputTokens / 1_000_000) * rate.inputPer1M +
    (outputTokens / 1_000_000) * rate.outputPer1M;
  return {
    costUsd: parseFloat(costUsd.toFixed(8)),
    inputTokens,
    outputTokens,
    model,
    rateKnown: true,
    rateSource: rate.rateSource,
  };
}

// ─── Google Places pricing note ───────────────────────────────────────────────
// Google Places (New) Text Search pricing:
// We log each call but mark the cost as 0 and set meta.rateKnown=false.
// Reason: Google's SKU pricing changes and varies by billing tier.
// Current public rate (as of mid-2025) is approximately $0.017/request,
// but this is NOT hardcoded — the caller should verify against their
// Google Cloud billing console. We log calls so the count is traceable.
export const GOOGLE_PLACES_RATE_KNOWN = false;
export const GOOGLE_PLACES_RATE_NOTE =
  "Rate not hardcoded — verify against Google Cloud Console. " +
  "Estimated ~$0.017/request (New Places API Text Search, 2025).";
