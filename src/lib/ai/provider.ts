/**
 * AI provider abstraction.
 *
 * Implements the Provider interface for Anthropic (real) and Mock (no-key)
 * backends.  Import getProvider() anywhere you need to make an LLM call.
 *
 * To add OpenAI or any other provider: implement Provider and swap it in
 * getProvider().  Nothing else in the codebase needs to change.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Provider {
  complete(messages: Message[], systemPrompt?: string): Promise<string>;
}

// ─── Anthropic ────────────────────────────────────────────────────────────────

export class AnthropicProvider implements Provider {
  constructor(
    private readonly apiKey: string,
    private readonly model = "claude-sonnet-4-6",
  ) {}

  async complete(messages: Message[], systemPrompt?: string): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 4096,
      messages,
    };
    if (systemPrompt) body.system = systemPrompt;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${err}`);
    }

    const data = (await res.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    return data.content.find((c) => c.type === "text")?.text ?? "";
  }
}

// ─── Mock (pass-through — agents supply their own mock logic) ─────────────────

export class MockProvider implements Provider {
  async complete(messages: Message[]): Promise<string> {
    // Return the last user message verbatim so each agent's mock function
    // can inspect the prompt text and produce a realistic response.
    return [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export interface ResolvedProvider {
  provider: Provider;
  isMock: boolean;
}

export function getProvider(): ResolvedProvider {
  const key =
    typeof import.meta !== "undefined"
      ? (import.meta as { env?: Record<string, string> }).env?.VITE_ANTHROPIC_API_KEY
      : undefined;

  if (key) return { provider: new AnthropicProvider(key), isMock: false };
  return { provider: new MockProvider(), isMock: true };
}
