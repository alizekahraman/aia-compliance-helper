/**
 * Evaluator — thin facade over the EvaluatorAgent.
 *
 * Decides whether the collected answers are sufficient for classification,
 * and returns follow-up questions when they are not.
 */

import type { BasicInfo, QAEntry } from "@/lib/types";
import { getProvider } from "./provider";
import { evaluatorAgent } from "./agents/evaluator";
import type { FollowUpQuestion } from "./schema";

export const CONFIDENCE_THRESHOLD = 0.75;

export interface EvaluationResult {
  sufficient: boolean;
  confidence: number;
  followUpQuestions: FollowUpQuestion[];
}

export async function evaluate(
  basics: BasicInfo,
  answers: QAEntry[],
): Promise<EvaluationResult> {
  const { provider, isMock } = getProvider();
  const response = await evaluatorAgent.run({ basics, answers }, provider, isMock);
  return {
    sufficient: response.sufficientInformation,
    confidence: response.confidence,
    followUpQuestions: response.followUpQuestions,
  };
}

export function toInterviewQuestion(fq: FollowUpQuestion): {
  id: string;
  text: string;
  hint?: string;
  options: { value: string; label: string }[];
} {
  return { id: fq.id, text: fq.text, hint: fq.hint, options: fq.options };
}
