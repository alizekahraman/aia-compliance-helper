/**
 * BaseAgent — abstract class all specialist agents extend.
 *
 * Each subclass supplies:
 *   name          — human-readable label (used in progress events)
 *   systemPrompt  — persona/instructions sent as the system turn
 *   buildPrompt   — converts typed input → user message string
 *   schema        — Zod type for validating the LLM's JSON response
 *   mockResponse  — deterministic fallback when no API key is present
 *
 * The run() method handles the full request/parse/validate lifecycle.
 */

import { z } from "zod";
import type { Provider } from "../provider";

// ─── JSON extraction (shared utility) ────────────────────────────────────────

export function extractJSON(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(candidate);
}

// ─── Base class ───────────────────────────────────────────────────────────────

export abstract class BaseAgent<TInput, TOutput> {
  abstract readonly name: string;
  abstract readonly systemPrompt: string;

  protected abstract buildPrompt(input: TInput): string;
  protected abstract readonly schema: z.ZodType<TOutput>;
  protected abstract mockResponse(prompt: string): Promise<string>;

  async run(input: TInput, provider: Provider, isMock: boolean): Promise<TOutput> {
    const prompt = this.buildPrompt(input);

    const raw = isMock
      ? await this.mockResponse(prompt)
      : await provider.complete(
          [{ role: "user", content: prompt }],
          this.systemPrompt,
        );

    const parsed = extractJSON(raw);
    return this.schema.parse(parsed);
  }
}
