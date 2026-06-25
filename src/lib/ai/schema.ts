import { z } from "zod";

// ─── Shared primitives ────────────────────────────────────────────────────────

export const RiskLevelSchema = z.enum([
  "minimal",
  "limited",
  "high",
  "unacceptable",
  "gpai",
]);

export const ApplicableArticleSchema = z.object({
  article: z.string(),
  title: z.string(),
  reason: z.string(),
});

export const FollowUpOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

export const FollowUpQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  hint: z.string().optional(),
  options: z.array(FollowUpOptionSchema).min(2).max(4),
});

export const RoadmapCategorySchema = z.enum([
  "Governance",
  "Documentation",
  "Technical Controls",
  "Human Oversight",
  "Data Governance",
  "Cybersecurity",
  "Transparency",
  "Monitoring",
]);

export const RoadmapItemResponseSchema = z.object({
  category: RoadmapCategorySchema,
  title: z.string(),
  description: z.string(),
  why: z.string(),
  article: z.string().optional(),
  responsibleRole: z.string().optional(),
  requiredEvidence: z.array(z.string()).optional(),
  suggestedDocuments: z.array(z.string()).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  effort: z.enum(["S", "M", "L", "XL"]),
});

// ─── ConversationAgent ───────────────────────────────────────────────────────

export const ConversationResponseSchema = z.object({
  nextQuestion: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  sufficient: z.boolean(),
  suggestedOptions: z.array(z.string()),
});

// ─── EvaluatorAgent ──────────────────────────────────────────────────────────

export const EvaluationResponseSchema = z.object({
  sufficientInformation: z.boolean(),
  confidence: z.number().min(0).max(1),
  followUpQuestions: z.array(FollowUpQuestionSchema),
});

// ─── ClassificationAgent ─────────────────────────────────────────────────────

export const ClassificationAgentResponseSchema = z.object({
  riskClassification: RiskLevelSchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  missingInformation: z.array(z.string()),
});

// ─── LegalAgent ──────────────────────────────────────────────────────────────

export const LegalAgentResponseSchema = z.object({
  applicableArticles: z.array(ApplicableArticleSchema).min(1),
  obligations: z.array(z.string()).min(1),
  exemptions: z.array(z.string()),
  recommendedDocuments: z.array(z.string()),
});

// ─── ComplianceAgent ─────────────────────────────────────────────────────────

export const ComplianceAgentResponseSchema = z.object({
  roadmapItems: z.array(RoadmapItemResponseSchema).min(1),
  prioritySummary: z.string(),
});

// ─── DocumentationAgent ──────────────────────────────────────────────────────

export const DocumentationAgentResponseSchema = z.object({
  content: z.string().min(1),
});

// ─── ReviewerAgent ───────────────────────────────────────────────────────────

export const ReviewerCorrectionSchema = z.object({
  field: z.string(),
  original: z.string(),
  corrected: z.string(),
  reason: z.string(),
});

export const ReviewerAgentResponseSchema = z.object({
  consistent: z.boolean(),
  issues: z.array(z.string()),
  corrections: z.array(ReviewerCorrectionSchema),
  finalConfidence: z.number().min(0).max(1),
});

// ─── Orchestration result (assembled from all agents) ────────────────────────

export const OrchestrationResultSchema = z.object({
  classification: ClassificationAgentResponseSchema,
  legal: LegalAgentResponseSchema,
  compliance: ComplianceAgentResponseSchema,
  review: ReviewerAgentResponseSchema,
});

// ─── Legacy combined schema (kept for backward compat) ───────────────────────
// The orchestrator assembles this from the per-agent outputs.

export const ClassificationResponseSchema = z.object({
  riskClassification: RiskLevelSchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  missingInformation: z.array(z.string()),
  applicableArticles: z.array(ApplicableArticleSchema),
  obligations: z.array(z.string()),
  implementationRoadmap: z.array(z.string()),
  generatedDocuments: z.array(z.string()),
});

export const RoadmapResponseSchema = z.object({
  items: z.array(RoadmapItemResponseSchema).min(1),
});

export const DocumentResponseSchema = z.object({
  content: z.string().min(1),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type ConversationResponse = z.infer<typeof ConversationResponseSchema>;
export type FollowUpQuestion = z.infer<typeof FollowUpQuestionSchema>;
export type EvaluationResponse = z.infer<typeof EvaluationResponseSchema>;
export type ClassificationAgentResponse = z.infer<typeof ClassificationAgentResponseSchema>;
export type LegalAgentResponse = z.infer<typeof LegalAgentResponseSchema>;
export type ComplianceAgentResponse = z.infer<typeof ComplianceAgentResponseSchema>;
export type DocumentationAgentResponse = z.infer<typeof DocumentationAgentResponseSchema>;
export type ReviewerAgentResponse = z.infer<typeof ReviewerAgentResponseSchema>;
export type ReviewerCorrection = z.infer<typeof ReviewerCorrectionSchema>;
export type OrchestrationResult = z.infer<typeof OrchestrationResultSchema>;
export type ClassificationResponse = z.infer<typeof ClassificationResponseSchema>;
export type RoadmapItemResponse = z.infer<typeof RoadmapItemResponseSchema>;
export type RoadmapResponse = z.infer<typeof RoadmapResponseSchema>;
export type DocumentResponse = z.infer<typeof DocumentResponseSchema>;
