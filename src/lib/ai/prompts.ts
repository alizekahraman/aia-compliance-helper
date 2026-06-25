/**
 * Prompt template library.
 *
 * One exported builder per agent.  Prompts are pure functions: input → string.
 * No business logic lives here — only formatting.
 */

import type { BasicInfo, QAEntry } from "@/lib/types";
import type {
  ClassificationAgentResponse,
  LegalAgentResponse,
  ComplianceAgentResponse,
} from "./schema";

// ─── Shared helpers ───────────────────────────────────────────────────────────

export function formatQA(answers: QAEntry[]): string {
  if (answers.length === 0) return "(no answers collected yet)";
  return answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n");
}

export function formatSystemContext(basics: BasicInfo): string {
  return [
    `Name: ${basics.systemName}`,
    `Description: ${basics.description}`,
    `Industry: ${basics.industry}`,
    `Role: ${basics.role} (provider = trains/develops; deployer = uses a third-party model)`,
    `Audience: ${basics.audience}`,
    `Region: ${basics.region}`,
  ].join("\n");
}

const RISK_RULES = `
EU AI Act risk classification rules:
- "unacceptable": Art. 5 prohibited practices — real-time biometric ID in public spaces, social scoring, subliminal manipulation, exploitation of vulnerabilities.
- "gpai": System IS or trains a general-purpose AI model (Art. 51–55). GPAI with systemic risk (>10^25 FLOPs) has extra obligations.
- "high": Annex III — biometrics, critical infrastructure, education, employment/HR, essential services (credit/benefits/emergency), law enforcement, migration, administration of justice.
- "limited": Art. 50 transparency — chatbots, emotion recognition, biometric categorisation, deepfake/synthetic content generation.
- "minimal": Everything else.
If multiple categories apply, choose the highest-risk applicable one.
`.trim();

// ─── ConversationAgent ───────────────────────────────────────────────────────

export const CONVERSATION_SYSTEM = `You are an experienced EU AI Act compliance consultant conducting an intake interview.

Your objective is to learn enough about an AI system to classify it under the EU AI Act with confidence ≥ 0.90.

Rules:
- Ask ONE focused question per turn. Never bundle two questions.
- Build logically on what the user just said. If they say "we approve loans", your next question should be about the decision process, not something unrelated.
- Do not repeat anything already established from the system description or previous answers.
- Keep questions conversational, not bureaucratic. Sound like a knowledgeable colleague, not a form.
- Provide 2–4 short suggestedOptions when the question has natural discrete answers. Omit options for open-ended questions.
- Set sufficient = true and nextQuestion = null as soon as confidence ≥ 0.90.

Key EU AI Act classification factors (focus your questions on what's still unknown):
1. What the system concretely does and for whom
2. Whether it makes or influences decisions with legal, financial, or physical effects on people
3. What sensitive data it processes (biometrics, health, financial records)
4. The level of human oversight over AI outputs
5. The deployment region (EU scope)
6. Whether it generates synthetic content (text, images, audio, video)
7. Who is accountable for its production behaviour`;

export type ConversationTurn = { question: string; answer: string };

export function buildConversationPrompt(
  basics: BasicInfo,
  history: ConversationTurn[],
): string {
  const historyBlock =
    history.length === 0
      ? "(no exchanges yet — this is the first question)"
      : history
          .map((t, i) => `Turn ${i + 1}\nYou asked: ${t.question}\nThey answered: ${t.answer}`)
          .join("\n\n");

  return `## AI System Under Review
${formatSystemContext(basics)}

## Conversation So Far
${historyBlock}

## Your Task
Decide what to ask next to maximally improve classification confidence.

Return ONLY valid JSON (no markdown, no surrounding text):
{
  "nextQuestion": "Your next question as a string, or null if you have enough",
  "confidence": number (0.0–1.0, your current estimate),
  "sufficient": boolean (true when confidence ≥ 0.90),
  "suggestedOptions": ["Option A", "Option B"]
}`;
}

// ─── EvaluatorAgent ──────────────────────────────────────────────────────────

export const EVALUATOR_SYSTEM = `You are an EU AI Act intake specialist. Your only job is to decide whether the information collected about an AI system is sufficient to classify it confidently, and to generate targeted follow-up questions when it is not. You do not classify systems yourself — you prepare the ground for the classification agent.`;

export function buildEvaluationPrompt(basics: BasicInfo, answers: QAEntry[]): string {
  return `## System Under Review
${formatSystemContext(basics)}

## Answers Collected So Far
${formatQA(answers)}

${RISK_RULES}

## Task
Determine whether the information above is sufficient for confident EU AI Act classification (confidence ≥ 0.75).

If NOT sufficient, generate up to 3 targeted follow-up questions on the highest-impact unknowns. Each question:
- id: unique snake_case string
- text: question to ask
- hint: optional short clarifying note (omit if not useful)
- options: 2–4 choices with { value, label }

Return ONLY valid JSON (no markdown fences, no surrounding text):
{
  "sufficientInformation": boolean,
  "confidence": number,
  "followUpQuestions": [{ "id": "...", "text": "...", "hint": "...", "options": [{ "value": "...", "label": "..." }] }]
}`;
}

// ─── ClassificationAgent ─────────────────────────────────────────────────────

export const CLASSIFICATION_SYSTEM = `You are an EU AI Act risk classification specialist. Your sole output is a risk category, confidence score, reasoning, and a list of information gaps. You do not cite specific articles (that is the Legal Agent's job) and you do not generate roadmap items.`;

export function buildClassificationPrompt(basics: BasicInfo, answers: QAEntry[]): string {
  return `## System Under Review
${formatSystemContext(basics)}

## Interview Answers
${formatQA(answers)}

${RISK_RULES}

## Task
Classify this AI system under the EU AI Act. Focus on accuracy — the Legal Agent will handle article citations.

Return ONLY valid JSON:
{
  "riskClassification": "minimal" | "limited" | "high" | "unacceptable" | "gpai",
  "confidence": number (0.0–1.0),
  "reasoning": "Detailed explanation referencing the classification rules above",
  "missingInformation": ["what additional context would improve confidence"]
}`;
}

// ─── LegalAgent ──────────────────────────────────────────────────────────────

export const LEGAL_SYSTEM = `You are an EU AI Act legal analyst specialising in article mapping and obligation derivation. You receive a risk classification and system context; you identify every applicable article, derive concrete obligations in plain language, note any exemptions, and list the compliance documents that will be required.`;

export function buildLegalPrompt(
  basics: BasicInfo,
  answers: QAEntry[],
  classification: ClassificationAgentResponse,
): string {
  return `## System Under Review
${formatSystemContext(basics)}

## Interview Answers
${formatQA(answers)}

## Classification Agent Output
- Risk: ${classification.riskClassification}
- Confidence: ${Math.round(classification.confidence * 100)}%
- Reasoning: ${classification.reasoning}

## Task
Identify all applicable EU AI Act articles for this system and derive its obligations.

Return ONLY valid JSON:
{
  "applicableArticles": [
    { "article": "Art. X", "title": "Official article title", "reason": "Why this article applies to this specific system" }
  ],
  "obligations": [
    "Plain-language obligation (one concrete action per item)"
  ],
  "exemptions": [
    "Any applicable exemptions or safe harbours (empty array if none)"
  ],
  "recommendedDocuments": [
    "Document type names from: Risk Management Plan, AI Policy, Technical Documentation, Human Oversight Procedure, AI Inventory, AI Literacy Plan"
  ]
}

Include all mandatory articles for a ${classification.riskClassification}-risk system. Be specific — generic article citations are not useful.`;
}

// ─── ComplianceAgent ─────────────────────────────────────────────────────────

export const COMPLIANCE_SYSTEM = `You are an EU AI Act compliance implementation specialist. You receive the risk classification and legal analysis; you translate them into a concrete, prioritised implementation roadmap with realistic effort estimates.`;

export function buildCompliancePrompt(
  basics: BasicInfo,
  classification: ClassificationAgentResponse,
  legal: LegalAgentResponse,
): string {
  const articleList = legal.applicableArticles
    .map((a) => `${a.article}: ${a.title}`)
    .join("\n");
  const obligationList = legal.obligations.map((o, i) => `${i + 1}. ${o}`).join("\n");

  return `## System Under Review
- Name: ${basics.systemName}
- Industry: ${basics.industry}
- Role: ${basics.role}
- Audience: ${basics.audience}
- Risk Classification: ${classification.riskClassification}

## Reasoning
${classification.reasoning}

## Applicable Articles
${articleList}

## Obligations
${obligationList}

## Task
Generate a prioritised, actionable compliance implementation roadmap (8–15 items).

Categories (use exactly): "Governance" | "Documentation" | "Technical Controls" | "Human Oversight" | "Data Governance" | "Cybersecurity" | "Transparency" | "Monitoring"

Return ONLY valid JSON:
{
  "roadmapItems": [
    {
      "category": "...",
      "title": "Concise action title",
      "description": "Specific steps to take",
      "why": "Why this matters for this specific system",
      "article": "Art. X (primary article this satisfies)",
      "responsibleRole": "Job title or team responsible",
      "requiredEvidence": ["Evidence item 1", "Evidence item 2"],
      "suggestedDocuments": ["Document type from: Risk Management Plan, AI Policy, Technical Documentation, Human Oversight Procedure, AI Inventory, AI Literacy Plan"],
      "priority": "low" | "medium" | "high" | "critical",
      "effort": "S" | "M" | "L" | "XL"
    }
  ],
  "prioritySummary": "One sentence on the top priority for this system"
}

For ${classification.riskClassification}-risk: mark mandatory pre-market blockers as "critical". Include at least 3 required evidence items per task.`;
}

// ─── ReviewerAgent ───────────────────────────────────────────────────────────

export const REVIEWER_SYSTEM = `You are an EU AI Act compliance QA reviewer. You receive the outputs of three specialist agents — Classification, Legal, and Compliance — and verify their internal consistency. You check for contradictions, missing mandatory elements, and calibration errors. You do not re-do their work; you only flag issues and propose targeted corrections.`;

export function buildReviewerPrompt(
  basics: BasicInfo,
  classification: ClassificationAgentResponse,
  legal: LegalAgentResponse,
  compliance: ComplianceAgentResponse,
): string {
  return `## System Under Review
- Name: ${basics.systemName}
- Industry: ${basics.industry}
- Role: ${basics.role}

## Classification Agent Output
- Risk: ${classification.riskClassification}
- Confidence: ${Math.round(classification.confidence * 100)}%
- Reasoning: ${classification.reasoning}
- Missing info: ${classification.missingInformation.join("; ") || "none"}

## Legal Agent Output
Articles: ${legal.applicableArticles.map((a) => a.article).join(", ")}
Obligations count: ${legal.obligations.length}
Recommended documents: ${legal.recommendedDocuments.join(", ")}

## Compliance Agent Output
Roadmap items: ${compliance.roadmapItems.length}
Priority summary: ${compliance.prioritySummary}
Critical items: ${compliance.roadmapItems.filter((i) => i.priority === "critical").length}

## Checks to Perform
1. Does the risk classification match the cited articles? (e.g. Art. 5 ↔ unacceptable; Annex III ↔ high)
2. Are all mandatory articles for the risk level present?
3. Is the confidence score calibrated appropriately given the evidence?
4. Do roadmap items cover every cited article obligation?
5. Are critical items present if the risk is high/unacceptable/gpai?
6. Any logical contradictions between agents' outputs?

Return ONLY valid JSON:
{
  "consistent": boolean,
  "issues": ["Description of each issue found"],
  "corrections": [
    {
      "field": "e.g. classification.riskClassification",
      "original": "the current value",
      "corrected": "the correct value",
      "reason": "why this correction is needed"
    }
  ],
  "finalConfidence": number (0.0–1.0, your assessment of overall output quality)
}`;
}

// ─── DocumentationAgent ──────────────────────────────────────────────────────

export const DOCUMENTATION_SYSTEM = `You are an EU AI Act technical writer. You produce professional, directly-usable compliance documents in Markdown, tailored to the specific AI system described. You do not produce generic templates — every section references the system by name and reflects its actual risk classification and obligations.`;

export function buildDocumentationPrompt(
  template: string,
  context: {
    systemName: string;
    industry: string;
    role: string;
    risk: string;
    description: string;
    articles?: Array<{ article: string; title: string }>;
    obligations?: string[];
    answers?: QAEntry[];
  },
): string {
  const articlesStr =
    context.articles && context.articles.length > 0
      ? `\n## Applicable Articles\n${context.articles.map((a) => `- ${a.article}: ${a.title}`).join("\n")}\n`
      : "";

  const obligationsStr =
    context.obligations && context.obligations.length > 0
      ? `\n## Obligations to Address\n${context.obligations.map((o, i) => `${i + 1}. ${o}`).join("\n")}\n`
      : "";

  const qaStr =
    context.answers && context.answers.length > 0
      ? `\n## Assessment Context\n${formatQA(context.answers)}\n`
      : "";

  return `## Document to Generate: "${template}"

## System
- Name: ${context.systemName}
- Industry: ${context.industry}
- Role: ${context.role}
- Risk Classification: ${context.risk}
- Description: ${context.description}
${articlesStr}${obligationsStr}${qaStr}
## Task
Generate a complete, professional "${template}" in Markdown, tailored to ${context.systemName}. Include all sections required for a ${context.risk}-risk ${context.role} under the EU AI Act. Reference specific articles. Make it immediately usable, not a fill-in-the-blanks template.

Return ONLY valid JSON:
{ "content": "# ${template}\\n\\nFull markdown document..." }`;
}
