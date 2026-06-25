import type { BasicInfo } from "@/lib/types";
import {
  ReviewerAgentResponseSchema,
  type ReviewerAgentResponse,
  type ClassificationAgentResponse,
  type LegalAgentResponse,
  type ComplianceAgentResponse,
} from "../schema";
import { REVIEWER_SYSTEM, buildReviewerPrompt } from "../prompts";
import { BaseAgent } from "./base";

// ─── Consistency rules (mirrors what the real LLM would check) ────────────────

const PROHIBITED_ARTICLES = ["Art. 5"];
const HIGH_RISK_ARTICLES = ["Annex III", "Art. 9", "Art. 10", "Art. 11", "Art. 14", "Art. 15"];
const GPAI_ARTICLES = ["Art. 53", "Art. 54", "Art. 55"];

function hasCitation(articles: LegalAgentResponse["applicableArticles"], prefix: string): boolean {
  return articles.some((a) => a.article.startsWith(prefix));
}

// ─── Mock ─────────────────────────────────────────────────────────────────────

async function mockReview(prompt: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 300));

  const riskMatch = prompt.match(/Risk:\s*(\w+)/);
  const risk = riskMatch?.[1] ?? "limited";
  const articlesMatch = prompt.match(/Articles:\s*(.+)/);
  const articleList = articlesMatch?.[1]?.split(",").map((s) => s.trim()) ?? [];
  const criticalMatch = prompt.match(/Critical items:\s*(\d+)/);
  const criticalCount = parseInt(criticalMatch?.[1] ?? "0", 10);

  const issues: string[] = [];
  const corrections: ReviewerAgentResponse["corrections"] = [];

  // Check: prohibited practices must cite Art. 5
  if (risk === "unacceptable" && !articleList.some((a) => a.startsWith("Art. 5"))) {
    issues.push("Unacceptable risk classification without Art. 5 citation.");
    corrections.push({
      field: "legal.applicableArticles",
      original: "No Art. 5 citation",
      corrected: "Add Art. 5 (Prohibited AI Practices)",
      reason: "Unacceptable risk classification must always cite Art. 5.",
    });
  }

  // Check: high-risk must have critical roadmap items
  if ((risk === "high" || risk === "gpai") && criticalCount === 0) {
    issues.push("High/GPAI risk system has no critical roadmap items.");
    corrections.push({
      field: "compliance.roadmapItems[priority]",
      original: "0 critical items",
      corrected: "Elevate mandatory pre-market items to critical",
      reason: "High-risk systems have mandatory obligations that block market entry.",
    });
  }

  // Check: GPAI must cite GPAI articles
  if (risk === "gpai" && !articleList.some((a) => a.startsWith("Art. 53"))) {
    issues.push("GPAI classification without Art. 53 citation.");
  }

  const confident = risk !== "unacceptable" || articleList.some((a) => a.startsWith("Art. 5"));
  const finalConfidence = confident ? 0.9 : 0.72;

  return JSON.stringify({
    consistent: issues.length === 0,
    issues,
    corrections,
    finalConfidence,
  });
}

// ─── Agent ────────────────────────────────────────────────────────────────────

type Input = {
  basics: BasicInfo;
  classification: ClassificationAgentResponse;
  legal: LegalAgentResponse;
  compliance: ComplianceAgentResponse;
};

class ReviewerAgent extends BaseAgent<Input, ReviewerAgentResponse> {
  readonly name = "Reviewer";
  readonly systemPrompt = REVIEWER_SYSTEM;
  protected readonly schema = ReviewerAgentResponseSchema;

  protected buildPrompt({ basics, classification, legal, compliance }: Input): string {
    return buildReviewerPrompt(basics, classification, legal, compliance);
  }

  protected mockResponse(prompt: string): Promise<string> {
    return mockReview(prompt);
  }
}

export const reviewerAgent = new ReviewerAgent();
