import type { BasicInfo, QAEntry } from "@/lib/types";
import { EvaluationResponseSchema, type EvaluationResponse } from "../schema";
import { EVALUATOR_SYSTEM, buildEvaluationPrompt } from "../prompts";
import { BaseAgent } from "./base";

// ─── Mock ─────────────────────────────────────────────────────────────────────

function mapKnownAnswers(prompt: string): Record<string, string> {
  const qaSection = prompt.match(/## Answers Collected So Far([\s\S]*?)(?:##|$)/)?.[1] ?? "";
  const pairs: Record<string, string> = {};
  const lines = qaSection.split("\n");
  let lastQ = "";
  for (const line of lines) {
    if (line.startsWith("Q: ")) lastQ = line.slice(3).trim();
    if (line.startsWith("A: ") && lastQ) {
      pairs[lastQ] = line.slice(3).trim();
      lastQ = "";
    }
  }
  const m: Record<string, string> = {};
  for (const [q, a] of Object.entries(pairs)) {
    if (q.includes("decisions affecting people")) m["decisions"] = a;
    if (q.includes("recruitment")) m["recruitment"] = a;
    if (q.includes("biometric")) m["biometric"] = a;
    if (q.includes("interact directly with humans")) m["human-interaction"] = a;
    if (q.includes("synthetic content")) m["content-generation"] = a;
    if (q.includes("General Purpose AI")) m["gpai"] = a;
    if (q.includes("override or contest")) m["override"] = a;
    if (q.includes("monitoring the system")) m["monitoring"] = a;
  }
  return m;
}

async function mockEvaluate(prompt: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 250));
  const a = mapKnownAnswers(prompt);
  const answeredCount = Object.keys(a).length;
  const sufficient = answeredCount >= 4;
  const confidence = Math.min(0.5 + answeredCount * 0.07, 0.88);

  const followUpQuestions = sufficient
    ? []
    : [
        {
          id: "data_subjects",
          text: "Does your system process personal data about EU residents?",
          hint: "Affects GDPR interplay and data governance obligations.",
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "unsure", label: "Unsure" },
          ],
        },
        {
          id: "automated_decisions",
          text: "Does the system make fully automated decisions without human review?",
          hint: "Fully automated decisions on individuals may trigger Art. 22 GDPR and AI Act oversight requirements.",
          options: [
            { value: "yes-binding", label: "Yes, binding decisions" },
            { value: "yes-recommends", label: "Yes, but humans can override" },
            { value: "no", label: "No" },
          ],
        },
      ].slice(0, 2);

  return JSON.stringify({ sufficientInformation: sufficient, confidence, followUpQuestions });
}

// ─── Agent ────────────────────────────────────────────────────────────────────

type Input = { basics: BasicInfo; answers: QAEntry[] };

class EvaluatorAgent extends BaseAgent<Input, EvaluationResponse> {
  readonly name = "Evaluator";
  readonly systemPrompt = EVALUATOR_SYSTEM;
  protected readonly schema = EvaluationResponseSchema;

  protected buildPrompt({ basics, answers }: Input): string {
    return buildEvaluationPrompt(basics, answers);
  }

  protected mockResponse(prompt: string): Promise<string> {
    return mockEvaluate(prompt);
  }
}

export const evaluatorAgent = new EvaluatorAgent();
