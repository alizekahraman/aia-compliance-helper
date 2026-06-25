import type { QAEntry, Assessment } from "@/lib/types";
import { DocumentationAgentResponseSchema, type DocumentationAgentResponse } from "../schema";
import { DOCUMENTATION_SYSTEM, buildDocumentationPrompt } from "../prompts";
import { BaseAgent, extractJSON } from "./base";
import type { Provider } from "../provider";
import { buildContext, renderTemplate } from "../document-templates";

// ─── Mock ─────────────────────────────────────────────────────────────────────

async function mockDocumentation(input: Input): Promise<string> {
  await new Promise((r) => setTimeout(r, 420));

  // Build a minimal Assessment-like object from the flat input so we can reuse
  // buildContext() which expects Assessment | null.
  const syntheticAssessment: Assessment | null = input.assessment ?? null;

  const ctx = syntheticAssessment
    ? buildContext(syntheticAssessment)
    : {
        name: input.systemName,
        description: input.description,
        industry: input.industry,
        role: input.role,
        risk: input.risk,
        today: new Date().toISOString().slice(0, 10),
        articles: input.articles?.map((a) => a.article).join(", ") ?? "",
        isHigh: input.risk === "high",
        isGPAI: input.risk === "gpai",
        isUnacceptable: input.risk === "unacceptable",
      };

  const content = renderTemplate(input.template, ctx);
  return JSON.stringify({ content });
}

// ─── Agent ────────────────────────────────────────────────────────────────────

type Input = {
  template: string;
  systemName: string;
  industry: string;
  role: string;
  risk: string;
  description: string;
  articles?: Array<{ article: string; title: string }>;
  obligations?: string[];
  answers?: QAEntry[];
  // Pass the full assessment when available so the mock can use buildContext()
  assessment?: Assessment;
};

class DocumentationAgent extends BaseAgent<Input, DocumentationAgentResponse> {
  readonly name = "Documentation";
  readonly systemPrompt = DOCUMENTATION_SYSTEM;
  protected readonly schema = DocumentationAgentResponseSchema;

  protected buildPrompt(input: Input): string {
    return buildDocumentationPrompt(input.template, {
      systemName: input.systemName,
      industry: input.industry,
      role: input.role,
      risk: input.risk,
      description: input.description,
      articles: input.articles,
      obligations: input.obligations,
      answers: input.answers,
    });
  }

  protected mockResponse(_prompt: string): Promise<string> {
    // Unused — run() is not overridden here; the real dispatch calls mockResponse
    // with the prompt string. We store `this._input` temporarily so mockDocumentation
    // gets the structured data.
    return Promise.resolve(JSON.stringify({ content: "" }));
  }

  // Override run() so the mock receives the typed input directly.
  async run(
    input: Input,
    provider: Provider,
    isMock: boolean,
  ): Promise<DocumentationAgentResponse> {
    if (isMock) {
      const raw = await mockDocumentation(input);
      const parsed = JSON.parse(raw) as unknown;
      return this.schema.parse(parsed);
    }
    const prompt = this.buildPrompt(input);
    const raw = await provider.complete(
      [{ role: "user", content: prompt }],
      this.systemPrompt,
    );
    return this.schema.parse(extractJSON(raw));
  }
}

export const documentationAgent = new DocumentationAgent();
