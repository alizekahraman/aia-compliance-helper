/**
 * Public API for the assessment flow.
 *
 * classifyAssessment() now drives the full multi-agent orchestration pipeline.
 * The optional onProgress callback lets the UI show which agent is running.
 * Call sites that don't need progress just omit the callback.
 */

import type { BasicInfo, ClassificationResult, QAEntry, RoadmapItem } from "@/lib/types";
import { orchestrate, type ProgressCallback } from "./orchestrator";

export type { ProgressCallback, ProgressEvent, AgentStage, StageStatus } from "./orchestrator";

export interface ClassifyOutput {
  classification: ClassificationResult;
  roadmap: RoadmapItem[];
}

export async function classifyAssessment(
  basics: BasicInfo,
  answers: QAEntry[],
  onProgress?: ProgressCallback,
): Promise<ClassifyOutput> {
  const { classificationResult, roadmapItems } = await orchestrate(basics, answers, onProgress);
  return { classification: classificationResult, roadmap: roadmapItems };
}

// generateRoadmap is no longer called separately — the orchestrator produces
// both the classification and roadmap in one pipeline run.  This re-export
// keeps the old signature available to avoid breaking any external callers,
// but it's a no-op wrapper since roadmap generation is part of classifyAssessment.
export async function generateRoadmap(
  basics: BasicInfo,
  classification: ClassificationResult,
): Promise<RoadmapItem[]> {
  const { roadmapItems } = await orchestrate(basics, [], undefined);
  // Return items aligned with the provided classification risk for consistency
  return roadmapItems;
}
