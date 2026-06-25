/**
 * ConversationAgent — drives the dynamic intake interview.
 *
 * Called once per turn with the full system context + conversation history.
 * Returns the next question (or null when confident enough), a running
 * confidence score, and optional quick-reply options.
 *
 * The mock implements a dimension-coverage model: each key EU AI Act factor
 * (decision impact, data type, human oversight, etc.) contributes a fixed
 * amount to confidence once evidence for it appears in the conversation.
 * When total coverage ≥ 0.90 the agent stops asking questions.
 */

import type { BasicInfo } from "@/lib/types";
import type { Provider } from "../provider";
import { ConversationResponseSchema, type ConversationResponse } from "../schema";
import { CONVERSATION_SYSTEM, buildConversationPrompt, type ConversationTurn } from "../prompts";
import { BaseAgent, extractJSON } from "./base";

export type { ConversationTurn };

// ─── Mock: dimension-coverage model ──────────────────────────────────────────

interface Dimension {
  id: string;
  confidenceGain: number;
  question: string;
  options: string[];
  isCovered: (basics: BasicInfo, history: ConversationTurn[]) => boolean;
}

function hasKeyword(texts: string[], ...patterns: RegExp[]): boolean {
  const joined = texts.join(" ").toLowerCase();
  return patterns.some((p) => p.test(joined));
}

const DIMENSIONS: Dimension[] = [
  {
    id: "decision_impact",
    confidenceGain: 0.20,
    question:
      "Does this system make or significantly influence decisions that have legal, financial, or physical effects on people — for example, approving loans, shortlisting candidates, or recommending medical treatment?",
    options: [
      "Yes, it makes binding decisions",
      "It provides recommendations, humans decide",
      "No direct impact on individuals",
    ],
    isCovered: (basics, history) =>
      hasKeyword(
        [basics.description, ...history.map((h) => h.answer)],
        /\b(decis|approv|reject|recommend|score|rank|eligib|shortlist|diagno|prescri|assess|evaluat)\b/,
      ),
  },
  {
    id: "impact_severity",
    confidenceGain: 0.15,
    question:
      "What types of outcomes does the system influence? For example: access to credit, employment, healthcare, benefits, education, or law enforcement?",
    options: [
      "Credit or financial services",
      "Employment or HR",
      "Healthcare or medical",
      "Public benefits or services",
      "None of the above",
    ],
    isCovered: (basics, history) =>
      hasKeyword(
        [basics.description, ...history.map((h) => h.answer)],
        /\b(credit|loan|mortgage|hiring|recruit|job|employ|healthcare|medical|patient|benefit|welfare|educat|law enforce|border|justice)\b/,
      ),
  },
  {
    id: "data_type",
    confidenceGain: 0.16,
    question:
      "What kind of data does the system process? In particular, does it handle biometric data, health records, financial data, or other sensitive personal information?",
    options: [
      "Biometric data (faces, fingerprints, voice)",
      "Health or medical records",
      "Financial or credit data",
      "Other personal data",
      "No personal data",
    ],
    isCovered: (basics, history) =>
      hasKeyword(
        [basics.description, ...history.map((h) => h.answer)],
        /\b(biometric|face|fingerprint|voice|health|medical|patient|financial|credit|personal data|sensitive|gdpr|pii)\b/,
      ),
  },
  {
    id: "human_oversight",
    confidenceGain: 0.13,
    question:
      "When the AI produces an output, does a human review and approve it before any action is taken — or does the system act autonomously?",
    options: [
      "Always human review before action",
      "Human review for edge cases only",
      "Fully automated, no human in the loop",
      "Varies by situation",
    ],
    isCovered: (basics, history) =>
      hasKeyword(
        [basics.description, ...history.map((h) => h.answer)],
        /\b(human|review|override|oversight|manual|automat|autonomous|approv|supervise|monitor)\b/,
      ),
  },
  {
    id: "geographic_scope",
    confidenceGain: 0.10,
    question:
      "Is this system deployed in the EU, or does it process data belonging to EU residents?",
    options: [
      "Yes, EU users or EU data",
      "Not currently, but planned",
      "No EU exposure",
      "Global deployment including EU",
    ],
    isCovered: (basics, history) =>
      basics.region.toLowerCase().includes("european") ||
      basics.region.toLowerCase().includes("eea") ||
      hasKeyword(
        history.map((h) => h.answer),
        /\b(eu|europe|european|eea|efta|gdpr|member state)\b/,
      ),
  },
  {
    id: "content_generation",
    confidenceGain: 0.10,
    question:
      "Does the system generate synthetic content — such as text, images, audio, or video — that users might mistake for human-created content?",
    options: [
      "Yes, generates text",
      "Yes, generates images or video",
      "Yes, generates audio",
      "No synthetic content generation",
    ],
    isCovered: (basics, history) =>
      hasKeyword(
        [basics.description, ...history.map((h) => h.answer)],
        /\b(generat|synthesiz|deepfake|chatbot|llm|language model|image gen|text gen|synthetic|content creat)\b/,
      ),
  },
  {
    id: "deployment_monitoring",
    confidenceGain: 0.09,
    question:
      "Once deployed, who is responsible for monitoring the system's behaviour in production — and is there a documented process for handling incidents?",
    options: [
      "Dedicated owner and documented process",
      "Shared responsibility, no formal process",
      "Not yet defined",
    ],
    isCovered: (basics, history) =>
      hasKeyword(
        [basics.description, ...history.map((h) => h.answer)],
        /\b(monitor|incident|owner|responsib|alert|log|audit|production|post.deploy)\b/,
      ),
  },
];

const CONFIDENCE_THRESHOLD = 0.90;

function basicsConfidence(basics: BasicInfo): number {
  let score = 0.10;
  if (basics.description.trim().length > 40) score += 0.10;
  if (basics.description.trim().length > 100) score += 0.05;
  if (basics.industry && basics.industry !== "Other") score += 0.05;
  if (basics.role) score += 0.02;
  return score;
}

async function mockConversation(
  basics: BasicInfo,
  history: ConversationTurn[],
): Promise<string> {
  await new Promise((r) => setTimeout(r, 320));

  const base = basicsConfidence(basics);
  const covered = DIMENSIONS.filter((d) => d.isCovered(basics, history));
  const gained = covered.reduce((sum, d) => sum + d.confidenceGain, 0);
  const confidence = Math.min(base + gained, 0.97);
  const sufficient = confidence >= CONFIDENCE_THRESHOLD;

  if (sufficient) {
    return JSON.stringify({ nextQuestion: null, confidence, sufficient: true, suggestedOptions: [] });
  }

  // Pick the highest-value uncovered dimension
  const uncovered = DIMENSIONS.filter((d) => !d.isCovered(basics, history)).sort(
    (a, b) => b.confidenceGain - a.confidenceGain,
  );

  if (uncovered.length === 0) {
    return JSON.stringify({ nextQuestion: null, confidence, sufficient: true, suggestedOptions: [] });
  }

  const next = uncovered[0];
  return JSON.stringify({
    nextQuestion: next.question,
    confidence,
    sufficient: false,
    suggestedOptions: next.options,
  });
}

// ─── Agent ────────────────────────────────────────────────────────────────────

type Input = { basics: BasicInfo; history: ConversationTurn[] };

class ConversationAgent extends BaseAgent<Input, ConversationResponse> {
  readonly name = "Conversation";
  readonly systemPrompt = CONVERSATION_SYSTEM;
  protected readonly schema = ConversationResponseSchema;

  protected buildPrompt({ basics, history }: Input): string {
    return buildConversationPrompt(basics, history);
  }

  protected async mockResponse(prompt: string): Promise<string> {
    // Extract basics and history from the prompt (the mock bypasses them and
    // uses the closure instead — but BaseAgent passes the prompt string, not
    // the original input).  We therefore re-parse from the closure captured
    // by wrapping mockConversation in run() via a stored reference.
    //
    // The cleanest solution: override run() to pass input directly.
    // For now we return a placeholder; the real dispatch happens in run().
    return prompt; // unused — see run() override below
  }

  // Override run() so the mock receives the typed input directly, avoiding
  // the need to re-parse the prompt string.
  async run(
    input: Input,
    provider: Provider,
    isMock: boolean,
  ): Promise<ConversationResponse> {
    if (isMock) {
      const raw = await mockConversation(input.basics, input.history);
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

export const conversationAgent = new ConversationAgent();
