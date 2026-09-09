import type { Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { logCost, calcAnthropicCost } from "../lib/costLogger.js";

interface KeywordsBody {
  businessName?: unknown;
  location?: unknown;
}

export async function suggestKeywordsHandler(req: Request, res: Response): Promise<void> {
  const b = req.body as KeywordsBody;

  if (typeof b.businessName !== "string" || !b.businessName.trim()) {
    res.status(400).json({ error: "businessName: required non-empty string" });
    return;
  }

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey || apiKey === "your_anthropic_api_key") {
    res.status(503).json({ error: "ANTHROPIC_API_KEY not configured" });
    return;
  }

  const businessName = b.businessName.trim();
  const location = typeof b.location === "string" ? b.location.trim() : "";

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `Generate 6-8 local SEO keyword phrases for tracking Google Maps rankings.

Business: ${businessName}${location ? `\nLocation: ${location}` : ""}

Return ONLY a valid JSON array of keyword strings — no explanation, no markdown, just the array.
Include: "near me" variants, service-specific terms, emergency/24hr variants if relevant.

Example: ["plumber near me", "emergency plumber", "drain cleaning service", "water heater repair near me"]`,
        },
      ],
    });

    const tokenCost = calcAnthropicCost(
      message.model,
      message.usage.input_tokens,
      message.usage.output_tokens
    );
    logCost({
      vendor: "anthropic",
      callType: "suggest_keywords",
      costUsd: tokenCost.costUsd,
      cacheHit: false,
      meta: {
        model: message.model,
        inputTokens: tokenCost.inputTokens,
        outputTokens: tokenCost.outputTokens,
        rateKnown: tokenCost.rateKnown,
        rateSource: tokenCost.rateSource,
      },
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "[]";

    // Extract the JSON array from the response
    const match = text.match(/\[[\s\S]*?\]/);
    let keywords: string[] = [];
    if (match) {
      try {
        const parsed: unknown = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          keywords = parsed.filter((k): k is string => typeof k === "string");
        }
      } catch {
        // JSON parse failed — return empty array
      }
    }

    res.json({ keywords });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: `AI request failed: ${msg}` });
  }
}
