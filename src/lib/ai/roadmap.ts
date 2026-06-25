/**
 * Roadmap generator.
 *
 * The roadmap is now produced by the ComplianceAgent as part of the full
 * orchestration pipeline.  This module is kept as a standalone entry point
 * for cases where only a roadmap is needed given an existing classification.
 */

import type { BasicInfo, ClassificationResult, RoadmapItem } from "@/lib/types";
import { getProvider } from "./provider";
import { complianceAgent } from "./agents/compliance";

export async function generateRoadmap(
  basics: BasicInfo,
  classification: ClassificationResult,
): Promise<RoadmapItem[]> {
  const { provider, isMock } = getProvider();

  // Build a minimal ClassificationAgentResponse from the existing result
  const cls = {
    riskClassification: classification.risk,
    confidence: classification.confidence,
    reasoning: classification.rationale,
    missingInformation: classification.missingInfo,
  };

  // Build a minimal LegalAgentResponse from the existing articles
  const legal = {
    applicableArticles: classification.articles,
    obligations: [],
    exemptions: [],
    recommendedDocuments: [],
  };

  const response = await complianceAgent.run({ basics, classification: cls, legal }, provider, isMock);

  return response.roadmapItems.map((item, i) => ({
    ...item,
    id: `rm-${i}-${Math.random().toString(36).slice(2, 7)}`,
    status: "not-started" as const,
  }));
}
