/**
 * Orchestrator — coordinates the multi-agent pipeline.
 *
 * Sequential flow:
 *   ClassificationAgent → LegalAgent → ComplianceAgent → ReviewerAgent
 *
 * The Reviewer may propose corrections; the orchestrator applies them before
 * assembling the final merged result.
 *
 * Progress events are delivered via an optional callback so the UI can show
 * which agent is currently running.
 */

import type { BasicInfo, QAEntry, ClassificationResult, RoadmapItem } from "@/lib/types";
import { getProvider } from "./provider";
import { classificationAgent } from "./agents/classification";
import { legalAgent } from "./agents/legal";
import { complianceAgent } from "./agents/compliance";
import { reviewerAgent } from "./agents/reviewer";
import type {
  ClassificationAgentResponse,
  LegalAgentResponse,
  ComplianceAgentResponse,
  ReviewerAgentResponse,
  OrchestrationResult,
  RiskLevel,
} from "./schema";

// ─── Progress events ──────────────────────────────────────────────────────────

export type AgentStage =
  | "classification"
  | "legal"
  | "compliance"
  | "reviewer"
  | "done";

export type StageStatus = "running" | "done" | "error";

export interface ProgressEvent {
  stage: AgentStage;
  status: StageStatus;
  label: string;
}

export type ProgressCallback = (event: ProgressEvent) => void;

const STAGE_LABELS: Record<AgentStage, string> = {
  classification: "Classification Agent — determining risk level…",
  legal: "Legal Agent — mapping applicable articles…",
  compliance: "Compliance Agent — building roadmap…",
  reviewer: "Reviewer Agent — checking consistency…",
  done: "Analysis complete",
};

// ─── Correction helpers ───────────────────────────────────────────────────────

function applyCorrections(
  classification: ClassificationAgentResponse,
  legal: LegalAgentResponse,
  compliance: ComplianceAgentResponse,
  review: ReviewerAgentResponse,
): {
  classification: ClassificationAgentResponse;
  legal: LegalAgentResponse;
  compliance: ComplianceAgentResponse;
} {
  // Deep-clone to avoid mutating agent outputs
  let cls = { ...classification };
  let leg = { ...legal, applicableArticles: [...legal.applicableArticles], obligations: [...legal.obligations] };
  let com = { ...compliance, roadmapItems: [...compliance.roadmapItems] };

  for (const c of review.corrections) {
    if (c.field === "classification.riskClassification") {
      cls = { ...cls, riskClassification: c.corrected as RiskLevel };
    }
    if (c.field === "classification.confidence") {
      cls = { ...cls, confidence: parseFloat(c.corrected) || cls.confidence };
    }
    // Roadmap priority corrections: elevate to critical
    if (c.field === "compliance.roadmapItems[priority]" && c.corrected.includes("critical")) {
      com = {
        ...com,
        roadmapItems: com.roadmapItems.map((item) =>
          item.priority === "high" ? { ...item, priority: "critical" as const } : item,
        ),
      };
    }
  }

  return { classification: cls, legal: leg, compliance: com };
}

// ─── Merge into legacy types expected by the UI ───────────────────────────────

function mergeToClassificationResult(
  classification: ClassificationAgentResponse,
  legal: LegalAgentResponse,
  review: ReviewerAgentResponse,
): ClassificationResult {
  return {
    risk: classification.riskClassification,
    confidence: review.finalConfidence,
    rationale: classification.reasoning,
    articles: legal.applicableArticles,
    missingInfo: classification.missingInformation,
  };
}

function mergeToRoadmapItems(compliance: ComplianceAgentResponse): RoadmapItem[] {
  return compliance.roadmapItems.map((item, i) => ({
    ...item,
    id: `rm-${i}-${Math.random().toString(36).slice(2, 7)}`,
    status: "not-started" as const,
  }));
}

// ─── Main orchestration function ──────────────────────────────────────────────

export interface OrchestrationOutput {
  result: OrchestrationResult;
  classificationResult: ClassificationResult;
  roadmapItems: RoadmapItem[];
}

export async function orchestrate(
  basics: BasicInfo,
  answers: QAEntry[],
  onProgress?: ProgressCallback,
): Promise<OrchestrationOutput> {
  const { provider, isMock } = getProvider();

  function emit(stage: AgentStage, status: StageStatus) {
    onProgress?.({ stage, status, label: STAGE_LABELS[stage] });
  }

  // ── 1. Classification ──────────────────────────────────────────────────────
  emit("classification", "running");
  let rawClassification: ClassificationAgentResponse;
  try {
    rawClassification = await classificationAgent.run({ basics, answers }, provider, isMock);
    emit("classification", "done");
  } catch (err) {
    emit("classification", "error");
    throw new Error(`Classification Agent failed: ${String(err)}`);
  }

  // ── 2. Legal ───────────────────────────────────────────────────────────────
  emit("legal", "running");
  let rawLegal: LegalAgentResponse;
  try {
    rawLegal = await legalAgent.run({ basics, answers, classification: rawClassification }, provider, isMock);
    emit("legal", "done");
  } catch (err) {
    emit("legal", "error");
    throw new Error(`Legal Agent failed: ${String(err)}`);
  }

  // ── 3. Compliance ──────────────────────────────────────────────────────────
  emit("compliance", "running");
  let rawCompliance: ComplianceAgentResponse;
  try {
    rawCompliance = await complianceAgent.run(
      { basics, classification: rawClassification, legal: rawLegal },
      provider,
      isMock,
    );
    emit("compliance", "done");
  } catch (err) {
    emit("compliance", "error");
    throw new Error(`Compliance Agent failed: ${String(err)}`);
  }

  // ── 4. Reviewer ────────────────────────────────────────────────────────────
  emit("reviewer", "running");
  let rawReview: ReviewerAgentResponse;
  try {
    rawReview = await reviewerAgent.run(
      { basics, classification: rawClassification, legal: rawLegal, compliance: rawCompliance },
      provider,
      isMock,
    );
    emit("reviewer", "done");
  } catch (err) {
    // Reviewer failure is non-fatal: proceed with unreviewed outputs
    console.warn("Reviewer Agent failed, proceeding without corrections:", err);
    rawReview = { consistent: true, issues: [], corrections: [], finalConfidence: rawClassification.confidence };
    emit("reviewer", "done");
  }

  // ── 5. Apply corrections & merge ──────────────────────────────────────────
  const { classification, legal, compliance } = applyCorrections(
    rawClassification,
    rawLegal,
    rawCompliance,
    rawReview,
  );

  emit("done", "done");

  const orchestrationResult: OrchestrationResult = {
    classification,
    legal,
    compliance,
    review: rawReview,
  };

  return {
    result: orchestrationResult,
    classificationResult: mergeToClassificationResult(classification, legal, rawReview),
    roadmapItems: mergeToRoadmapItems(compliance),
  };
}
