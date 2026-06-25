import type { Assessment, DocumentTemplate } from "@/lib/types";

/**
 * Mock document generator. Replace internals with an LLM call to produce
 * tailored Markdown using the assessment as context.
 */
export async function generateDocument(
  template: DocumentTemplate,
  assessment: Assessment | null,
): Promise<string> {
  await delay(350);
  const name = assessment?.basics.systemName ?? "Your AI System";
  const industry = assessment?.basics.industry ?? "—";
  const role = assessment?.basics.role ?? "provider";
  const risk = assessment?.classification?.risk ?? "limited";
  const today = new Date().toISOString().slice(0, 10);

  const header = `# ${template}\n\n**System:** ${name}  \n**Industry:** ${industry}  \n**Role:** ${role}  \n**Risk classification:** ${risk}  \n**Date:** ${today}\n\n---\n`;

  switch (template) {
    case "Risk Management Plan":
      return header + RMP(name);
    case "AI Policy":
      return header + AI_POLICY();
    case "Technical Documentation":
      return header + TECH_DOC(name);
    case "Human Oversight Procedure":
      return header + HUMAN_OVERSIGHT(name);
    case "AI Inventory":
      return header + AI_INVENTORY(name);
    case "AI Literacy Plan":
      return header + LITERACY();
  }
}

function RMP(name: string) {
  return `## 1. Purpose\nEstablish a continuous risk management process for **${name}** in line with Art. 9 of the EU AI Act.\n\n## 2. Scope\nApplies to the full lifecycle: design, training, deployment, operation, and decommissioning.\n\n## 3. Risk Identification\n- Foreseeable misuse scenarios\n- Impact on fundamental rights\n- Performance degradation and drift\n- Security and adversarial risks\n\n## 4. Risk Evaluation\nEach risk is scored on likelihood × impact (1–5) and assigned an owner.\n\n## 5. Mitigation Measures\nDocument controls, residual risk, and verification evidence.\n\n## 6. Review Cadence\nRisk register reviewed quarterly and after any major model or data change.\n`;
}
function AI_POLICY() {
  return `## 1. Commitment\nWe commit to developing and deploying AI that is lawful, ethical and robust.\n\n## 2. Principles\n- Human agency and oversight\n- Technical robustness and safety\n- Privacy and data governance\n- Transparency\n- Diversity, non-discrimination and fairness\n- Societal and environmental wellbeing\n- Accountability\n\n## 3. Governance\nAn AI Steering Committee approves all high-risk use cases.\n\n## 4. Prohibited Uses\nSee Art. 5 EU AI Act; additionally, internal policy bars use cases X, Y, Z.\n\n## 5. Training\nAll staff interacting with AI complete annual AI literacy training.\n`;
}
function TECH_DOC(name: string) {
  return `## 1. General Description\n${name} — intended purpose, users, deployment environment.\n\n## 2. Design Specifications\nArchitecture diagram, model family, key hyperparameters, third-party components.\n\n## 3. Data\nTraining/validation/test datasets, provenance, preprocessing, labelling.\n\n## 4. Performance Metrics\nAccuracy, precision/recall, calibration, robustness tests, fairness metrics.\n\n## 5. Risk Management Summary\nReference to the Risk Management Plan and current residual risks.\n\n## 6. Human Oversight Measures\nSee Human Oversight Procedure.\n\n## 7. Changes & Versioning\nChangelog of model versions and data refreshes.\n`;
}
function HUMAN_OVERSIGHT(name: string) {
  return `## 1. Roles\n- **Operator** — front-line user of ${name}.\n- **Reviewer** — qualified human who can override decisions.\n- **System Owner** — accountable for production behaviour.\n\n## 2. Oversight Points\n- Pre-decision: confidence threshold triggers human review.\n- Post-decision: user can contest and request human review.\n- Out-of-distribution detection halts the system.\n\n## 3. Stop Button\nDocumented kill-switch with response-time target < 5 minutes.\n\n## 4. Training\nReviewers complete onboarding and quarterly refresher training.\n`;
}
function AI_INVENTORY(name: string) {
  return `## AI Systems In Use\n\n| System | Purpose | Role | Risk | Owner | Status |\n|---|---|---|---|---|---|\n| ${name} | — | — | — | — | Active |\n\n## Notes\nKeep this inventory under version control. Review monthly.\n`;
}
function LITERACY() {
  return `## 1. Objectives\nEnsure staff have the skills, knowledge and understanding required by Art. 4.\n\n## 2. Audiences\n- Executives & sponsors\n- Product & engineering\n- Operators & reviewers\n- Risk, legal, compliance\n\n## 3. Curriculum\n- EU AI Act fundamentals\n- Role-specific risk patterns\n- Hands-on use of internal AI tools\n- Incident reporting\n\n## 4. Cadence\nOnboarding within 30 days, annual refresher, ad-hoc updates after major releases.\n`;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}