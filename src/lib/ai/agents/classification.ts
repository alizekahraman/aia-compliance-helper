import type { BasicInfo, QAEntry } from "@/lib/types";
import { ClassificationAgentResponseSchema, type ClassificationAgentResponse } from "../schema";
import { CLASSIFICATION_SYSTEM, buildClassificationPrompt, formatQA } from "../prompts";
import { BaseAgent } from "./base";

// ─── Mock ─────────────────────────────────────────────────────────────────────

function extractField(prompt: string, label: string): string {
  return prompt.match(new RegExp(`${label}:\\s*(.+)`))?.[1]?.trim() ?? "";
}

function mapAnswers(prompt: string): Record<string, string> {
  const qaSection = prompt.match(/## Interview Answers([\s\S]*?)(?:##|$)/)?.[1] ?? "";
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
    if (q.includes("synthetic content")) m["content-generation"] = a;
    if (q.includes("General Purpose AI")) m["gpai"] = a;
    if (q.includes("override or contest")) m["override"] = a;
    if (q.includes("monitoring the system")) m["monitoring"] = a;
  }
  return m;
}

async function mockClassification(prompt: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 400));
  const a = mapAnswers(prompt);
  const name = extractField(prompt, "Name");
  const roleRaw = extractField(prompt, "Role");
  const role = roleRaw.startsWith("provider") ? "provider" : "deployer";

  let risk = "limited";
  let confidence = 0.7;
  const missing: string[] = [];

  if (a["biometric"] === "yes-realtime") {
    risk = "unacceptable";
    confidence = 0.92;
  } else if (a["recruitment"] === "yes" || a["biometric"] === "yes-post") {
    risk = "high";
    confidence = 0.88;
  } else if (a["decisions"] === "yes") {
    risk = "high";
    confidence = 0.78;
  }
  if (a["gpai"] === "foundation") {
    risk = "gpai";
    confidence = 0.9;
  }
  if (a["content-generation"] === "yes" && risk === "limited") confidence = 0.82;
  if (a["override"] !== "yes") { missing.push("Clarify user contestation / override workflow."); confidence -= 0.05; }
  if (a["monitoring"] === "none") { missing.push("Assign an owner for production monitoring."); confidence -= 0.05; }

  const rationaleMap: Record<string, string> = {
    unacceptable: `Based on the answers, ${name} appears to fall within a prohibited practice under Art. 5 of the EU AI Act. Operating this system as a ${role} in the EU is not permitted in its current form.`,
    high: `${name} appears to be a high-risk AI system as a ${role}. It must meet the full Chapter III obligations before being placed on the EU market.`,
    gpai: `${name} qualifies as a General Purpose AI model. GPAI-specific obligations under Art. 51–55 apply in addition to use-case rules for downstream deployers.`,
    limited: `${name} is most likely a limited-risk system as a ${role}. Transparency obligations apply under Art. 50 but no conformity assessment is required.`,
    minimal: `${name} appears to be a minimal-risk system. Voluntary codes of conduct are recommended but no mandatory obligations apply.`,
  };

  return JSON.stringify({
    riskClassification: risk,
    confidence: Math.max(0.4, Math.min(0.98, confidence)),
    reasoning: rationaleMap[risk] ?? rationaleMap["minimal"],
    missingInformation: missing,
  });
}

// ─── Agent ────────────────────────────────────────────────────────────────────

type Input = { basics: BasicInfo; answers: QAEntry[] };

class ClassificationAgent extends BaseAgent<Input, ClassificationAgentResponse> {
  readonly name = "Classification";
  readonly systemPrompt = CLASSIFICATION_SYSTEM;
  protected readonly schema = ClassificationAgentResponseSchema;

  protected buildPrompt({ basics, answers }: Input): string {
    return buildClassificationPrompt(basics, answers);
  }

  protected mockResponse(prompt: string): Promise<string> {
    return mockClassification(prompt);
  }
}

export const classificationAgent = new ClassificationAgent();
