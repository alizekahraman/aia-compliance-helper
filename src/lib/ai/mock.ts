/**
 * Legacy stub.
 *
 * Mock logic has moved into each agent's mockResponse() method:
 *   agents/evaluator.ts     — mockEvaluate
 *   agents/classification.ts — mockClassification
 *   agents/legal.ts          — mockLegal
 *   agents/compliance.ts     — mockCompliance
 *   agents/reviewer.ts       — mockReview
 *   agents/documentation.ts  — mockDocumentation
 *
 * This file is kept to prevent import errors from any code that may
 * still reference @/lib/ai/mock.
 */

export {};
