import type { BasicInfo } from "@/lib/types";
import {
  ComplianceAgentResponseSchema,
  type ComplianceAgentResponse,
  type ClassificationAgentResponse,
  type LegalAgentResponse,
} from "../schema";
import { COMPLIANCE_SYSTEM, buildCompliancePrompt } from "../prompts";
import { BaseAgent } from "./base";

// ─── Mock ─────────────────────────────────────────────────────────────────────

function extractRisk(prompt: string): string {
  return prompt.match(/Risk Classification:\s*(\w+)/)?.[1] ?? "limited";
}

async function mockCompliance(prompt: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 400));
  const risk = extractRisk(prompt);
  const isHigh = risk === "high" || risk === "gpai";
  const isUnacceptable = risk === "unacceptable";

  const prioritySummaryMap: Record<string, string> = {
    unacceptable:
      "Immediately halt EU deployment and commission a legal review — no compliance roadmap can substitute for fundamental redesign.",
    high: "Compile Annex IV technical documentation and establish the risk management system before any market entry.",
    gpai: "Publish GPAI technical documentation and training data summary as the prerequisite for downstream deployment.",
    limited:
      "Implement user-facing AI disclosure and ensure staff AI literacy to meet Art. 50 and Art. 4.",
    minimal:
      "Adopt a voluntary code of conduct and maintain AI literacy records as best practice.",
  };

  const items = [
    // ── Governance ─────────────────────────────────────────────────────────────
    {
      category: "Governance",
      title: "Appoint an AI System Owner",
      description:
        "Designate a named individual with accountability for the system's compliance posture, risk acceptance authority, and point of contact for national supervisory authorities.",
      why: "Art. 9 requires a continuous risk management process with clear ownership. Without a named owner, accountability gaps undermine every other control.",
      article: "Art. 9",
      responsibleRole: "Senior Management / Chief AI Officer",
      requiredEvidence: [
        "Written role description or appointment letter",
        "Entry in AI Inventory naming the owner",
        "Escalation path documented in risk management plan",
      ],
      suggestedDocuments: ["AI Policy", "AI Inventory"],
      priority: isHigh ? "critical" : "high",
      effort: "S",
    },
    {
      category: "Governance",
      title: "Establish a continuous AI risk management process",
      description:
        "Define, document, and review risks across the full lifecycle — design, training, deployment, operation, and decommissioning. Include a quarterly review cycle and post-incident reviews.",
      why: "Art. 9 mandates a documented risk management system for high-risk AI. Even for limited/minimal risk, it is required evidence in any conformity assessment.",
      article: "Art. 9",
      responsibleRole: "AI System Owner / Risk Lead",
      requiredEvidence: [
        "Approved Risk Management Plan document",
        "Completed risk register with owner and residual risk columns",
        "Evidence of at least one quarterly review (meeting minutes or sign-off)",
      ],
      suggestedDocuments: ["Risk Management Plan"],
      priority: isHigh ? "critical" : "high",
      effort: "L",
    },
    {
      category: "Governance",
      title: "Register the system in the corporate AI Inventory",
      description:
        "Add a record for this system covering: name, purpose, risk level, EU AI Act category, owner, deployment date, and review schedule. Keep the record updated after every material change.",
      why: "Art. 71 requires high-risk systems to be registered in the EU AI database before market placement. An internal inventory is the prerequisite and audit trail.",
      article: "Art. 71",
      responsibleRole: "AI Compliance Function",
      requiredEvidence: [
        "AI Inventory entry with all mandatory fields completed",
        "For high-risk: EU AI database registration number",
        "Version history showing the record is maintained",
      ],
      suggestedDocuments: ["AI Inventory"],
      priority: isHigh ? "critical" : "medium",
      effort: "S",
    },
    {
      category: "Governance",
      title: "Run an AI Literacy programme for all relevant staff",
      description:
        "Train operators, reviewers, engineers, and management on EU AI Act obligations, the system's limitations, and the human oversight procedure. Document completions.",
      why: "Art. 4 requires providers and deployers to ensure sufficient AI literacy for staff who operate or oversee AI systems.",
      article: "Art. 4",
      responsibleRole: "HR / Learning & Development / AI Compliance",
      requiredEvidence: [
        "Training curriculum approved by management",
        "Completion records for all in-scope staff (≥ 80% pass rate on assessments)",
        "Schedule for annual refresher",
      ],
      suggestedDocuments: ["AI Literacy Plan"],
      priority: "medium",
      effort: "M",
    },

    // ── Documentation ──────────────────────────────────────────────────────────
    {
      category: "Documentation",
      title: "Compile Annex IV technical documentation",
      description:
        "Produce the mandatory technical dossier: general system description, design choices, training data, performance metrics, risk management summary, human oversight measures, and changes log.",
      why: "Art. 11 and Annex IV — mandatory for high-risk providers before market placement. National authorities and notified bodies require this for conformity assessment.",
      article: "Art. 11",
      responsibleRole: "Engineering Lead / AI System Owner",
      requiredEvidence: [
        "Completed Annex IV technical document covering all 8 mandatory sections",
        "Sign-off by AI System Owner",
        "Linked to EU AI database registration",
      ],
      suggestedDocuments: ["Technical Documentation"],
      priority: isHigh ? "critical" : "medium",
      effort: "XL",
    },
    {
      category: "Documentation",
      title: "Prepare the EU Declaration of Conformity",
      description:
        "Draft and sign the Declaration of Conformity (DoC) affirming that the system complies with all applicable requirements. Affix CE marking if required by your conformity assessment pathway.",
      why: "Art. 47 — high-risk system providers must draw up a DoC before placing the system on the EU market.",
      article: "Art. 47",
      responsibleRole: "AI System Owner / Legal",
      requiredEvidence: [
        "Signed Declaration of Conformity document",
        "CE marking applied to system and packaging",
        "DoC retained for 10 years from market placement",
      ],
      suggestedDocuments: ["Technical Documentation"],
      priority: isHigh ? "critical" : "low",
      effort: "M",
    },
    {
      category: "Documentation",
      title: "Write an AI Policy covering prohibited uses and governance",
      description:
        "Publish an organisation-wide AI Policy that names prohibited practices, guiding principles, the governance structure, and staff obligations. Have it approved by the AI Steering Committee.",
      why: "Art. 5 prohibited practices must be operationalised through internal policy so staff know which uses are forbidden. Art. 4 literacy requires documented guidance.",
      article: "Art. 5",
      responsibleRole: "Legal / Chief Compliance Officer",
      requiredEvidence: [
        "Board- or C-suite-approved AI Policy document",
        "Policy distributed to all relevant staff (acknowledgement log)",
        "Annual review date on the document",
      ],
      suggestedDocuments: ["AI Policy"],
      priority: isUnacceptable ? "critical" : "high",
      effort: "M",
    },

    // ── Technical Controls ─────────────────────────────────────────────────────
    {
      category: "Technical Controls",
      title: "Define and monitor accuracy and robustness KPIs",
      description:
        "Set measurable performance targets (accuracy, F1, fairness disparity gap, etc.) per the system's intended purpose. Run automated checks in the CI/CD pipeline and in production.",
      why: "Art. 15 requires declared and consistent performance levels throughout the system's lifecycle. Performance targets must be documented in the technical documentation.",
      article: "Art. 15",
      responsibleRole: "Engineering Lead / ML Engineer",
      requiredEvidence: [
        "Performance metric definitions and targets in technical documentation",
        "Validation and test set evaluation results",
        "Automated monitoring dashboard with alerting thresholds",
      ],
      suggestedDocuments: ["Technical Documentation", "Risk Management Plan"],
      priority: "high",
      effort: "M",
    },
    {
      category: "Technical Controls",
      title: "Run bias and fairness evaluation across protected groups",
      description:
        "Evaluate outputs for demographic parity, equalised odds, and other relevant fairness metrics across all protected attributes (gender, age, ethnicity, disability). Document acceptance thresholds and mitigations.",
      why: "Art. 10(5) requires that bias detection and correction measures are applied during training. Art. 15 ties accuracy requirements to non-discriminatory performance.",
      article: "Art. 10",
      responsibleRole: "ML Engineer / Responsible AI Lead",
      requiredEvidence: [
        "Bias evaluation report with metrics per protected attribute",
        "Documented acceptance thresholds and pass/fail determination",
        "Evidence that identified disparities were addressed before deployment",
      ],
      suggestedDocuments: ["Technical Documentation", "Risk Management Plan"],
      priority: isHigh ? "critical" : "high",
      effort: "M",
    },

    // ── Human Oversight ────────────────────────────────────────────────────────
    {
      category: "Human Oversight",
      title: "Design and document human-in-the-loop controls",
      description:
        "Define how operators can monitor outputs in real time, intervene on specific decisions, and halt the system. Specify confidence thresholds that trigger mandatory human review.",
      why: "Art. 14 requires that appropriate human oversight measures are built into the system so operators can effectively oversee its operation.",
      article: "Art. 14",
      responsibleRole: "AI System Owner / Product Lead",
      requiredEvidence: [
        "Human Oversight Procedure document approved by System Owner",
        "Technical implementation of override/halt capability with test evidence",
        "Confidence threshold configuration documented",
      ],
      suggestedDocuments: ["Human Oversight Procedure"],
      priority: isHigh ? "critical" : "high",
      effort: "M",
    },
    {
      category: "Human Oversight",
      title: "Train operators and reviewers on system limitations",
      description:
        "Provide tailored training so all reviewers can recognise edge-case failures, understand the model's limitations, and apply the override procedure correctly. Include simulated exercises.",
      why: "Art. 14(4) requires that operators have the knowledge, competence, and authority to oversee the system effectively.",
      article: "Art. 14",
      responsibleRole: "Oversight Lead / HR",
      requiredEvidence: [
        "Training completion records for all reviewers",
        "Practical simulation exercise results",
        "Annual refresher calendar",
      ],
      suggestedDocuments: ["Human Oversight Procedure", "AI Literacy Plan"],
      priority: "medium",
      effort: "S",
    },
    {
      category: "Human Oversight",
      title: "Establish an audit log for all human interventions",
      description:
        "Log every reviewer override decision with: timestamp, reviewer identity, case reference, decision (approved/modified/rejected), rationale, and time to decision. Retain for at least 3 years.",
      why: "Art. 12 requires that high-risk systems enable automatic logging of events relevant to post-market monitoring and incident investigations.",
      article: "Art. 12",
      responsibleRole: "Engineering Lead / Oversight Lead",
      requiredEvidence: [
        "Audit log system technical description",
        "Sample log entries demonstrating all required fields",
        "Retention period configuration and proof",
      ],
      suggestedDocuments: ["Human Oversight Procedure", "Technical Documentation"],
      priority: isHigh ? "high" : "medium",
      effort: "M",
    },

    // ── Data Governance ────────────────────────────────────────────────────────
    {
      category: "Data Governance",
      title: "Document training, validation, and test datasets",
      description:
        "Capture full provenance for each dataset: source, size, collection dates, licence, preprocessing steps, known limitations, and bias assessment results.",
      why: "Art. 10 mandates that training data is relevant, sufficiently representative, and free from errors. Providers must document the data governance practices applied.",
      article: "Art. 10",
      responsibleRole: "Data Engineering Lead / ML Engineer",
      requiredEvidence: [
        "Data provenance documentation for each training dataset",
        "Representativeness assessment across demographic groups",
        "Known limitations section with documented mitigations",
      ],
      suggestedDocuments: ["Technical Documentation"],
      priority: isHigh ? "critical" : "medium",
      effort: "L",
    },
    {
      category: "Data Governance",
      title: "Implement a data retention and deletion schedule",
      description:
        "Define how long training data is retained, under what legal basis, and when it is deleted. Apply data minimisation from the point of collection.",
      why: "GDPR Art. 5(1)(e) storage limitation — required where personal data is used. EU AI Act Art. 10 data governance requirement reinforces this obligation.",
      article: "Art. 10",
      responsibleRole: "Data Protection Officer / Data Engineering Lead",
      requiredEvidence: [
        "Data retention schedule signed off by DPO",
        "Evidence of deletion at scheduled intervals",
        "Privacy impact assessment (if personal data used)",
      ],
      suggestedDocuments: ["Technical Documentation", "AI Policy"],
      priority: "medium",
      effort: "M",
    },

    // ── Cybersecurity ──────────────────────────────────────────────────────────
    {
      category: "Cybersecurity",
      title: "Conduct an AI-specific threat model",
      description:
        "Model adversarial threats specific to AI: prompt injection, model extraction, training data poisoning, membership inference, and evasion attacks. Document mitigations for each.",
      why: "Art. 15(5) requires resilience to adversarial attempts to alter use, outputs, or performance. The threat model is evidence of this requirement being met.",
      article: "Art. 15",
      responsibleRole: "CISO / Security Lead",
      requiredEvidence: [
        "AI threat model document covering all attack vectors",
        "Mitigation controls documented per threat",
        "Penetration test results (annual minimum)",
      ],
      suggestedDocuments: ["Technical Documentation", "Risk Management Plan"],
      priority: isHigh ? "high" : "medium",
      effort: "M",
    },
    {
      category: "Cybersecurity",
      title: "Apply input validation and output sanitisation controls",
      description:
        "Validate and sanitise all inputs before inference to prevent injection attacks. Apply output filters to prevent harmful or unintended content from reaching end-users.",
      why: "Art. 15 requires technical robustness and security. Input validation is the primary control against prompt injection and adversarial input attacks.",
      article: "Art. 15",
      responsibleRole: "Engineering Lead / Security Lead",
      requiredEvidence: [
        "Input validation implementation and test cases",
        "Output filtering configuration and test results",
        "Security review sign-off",
      ],
      suggestedDocuments: ["Technical Documentation"],
      priority: isHigh ? "high" : "medium",
      effort: "M",
    },

    // ── Transparency ───────────────────────────────────────────────────────────
    {
      category: "Transparency",
      title: "Disclose AI interaction to end-users",
      description:
        "Add clear, prominent disclosure in the user interface when users interact with an AI system or receive AI-generated output. The disclosure must appear before any interaction begins.",
      why: "Art. 50(1) requires providers of conversational AI to ensure users are informed they are interacting with an AI, unless it is obvious from context.",
      article: "Art. 50",
      responsibleRole: "Product Lead / UX",
      requiredEvidence: [
        "Screenshot or recording showing AI disclosure in UI",
        "User consent flow if applicable",
        "Documentation of disclosure wording approved by Legal",
      ],
      suggestedDocuments: ["AI Policy", "Technical Documentation"],
      priority: "high",
      effort: "S",
    },
    {
      category: "Transparency",
      title: "Implement machine-readable watermarking for AI-generated content",
      description:
        "Apply machine-readable markers (watermarks or metadata) to all AI-generated text, images, audio, or video. Display visible labelling to end-users.",
      why: "Art. 50(2) requires providers of systems that generate synthetic content to mark it as AI-generated in a machine-readable format.",
      article: "Art. 50",
      responsibleRole: "Engineering Lead / Product Lead",
      requiredEvidence: [
        "Technical specification of watermarking/metadata implementation",
        "Test evidence that watermarks persist through common transformations",
        "User-visible label in product screenshots",
      ],
      suggestedDocuments: ["Technical Documentation"],
      priority: isUnacceptable ? "critical" : "medium",
      effort: "M",
    },
    {
      category: "Transparency",
      title: "Publish instructions for use",
      description:
        "Provide deployers with clear instructions for use covering: intended purpose, performance characteristics, known limitations, conditions under which the system should not be used, and human oversight requirements.",
      why: "Art. 13 requires that high-risk systems are accompanied by instructions for use that enable deployers to implement appropriate oversight.",
      article: "Art. 13",
      responsibleRole: "AI System Owner / Technical Writer",
      requiredEvidence: [
        "Instructions for use document covering all Art. 13(3) mandatory elements",
        "Evidence of delivery to deployers",
        "Update process when system capabilities change",
      ],
      suggestedDocuments: ["Technical Documentation", "Human Oversight Procedure"],
      priority: isHigh ? "high" : "low",
      effort: "M",
    },

    // ── Monitoring ─────────────────────────────────────────────────────────────
    {
      category: "Monitoring",
      title: "Implement a post-market monitoring plan",
      description:
        "Define what is monitored (performance metrics, fairness scores, user complaints, incident count), at what frequency, with what alerting thresholds, and who receives alerts.",
      why: "Art. 72 requires high-risk system providers to implement a post-market monitoring system to collect and review data after deployment.",
      article: "Art. 72",
      responsibleRole: "AI System Owner / Engineering Lead",
      requiredEvidence: [
        "Post-market monitoring plan document",
        "Monitoring dashboard with evidence of active metrics",
        "Quarterly monitoring review log",
      ],
      suggestedDocuments: ["Risk Management Plan", "Technical Documentation"],
      priority: isHigh ? "critical" : "medium",
      effort: "M",
    },
    {
      category: "Monitoring",
      title: "Define a serious incident reporting workflow",
      description:
        "Document the internal escalation path and the process for notifying national market surveillance authorities within the statutory deadline (72 hours for serious incidents).",
      why: "Art. 73 requires providers to report serious incidents to market surveillance authorities without undue delay and within 15 days of becoming aware (or 72 h if risk to life).",
      article: "Art. 73",
      responsibleRole: "AI System Owner / Legal",
      requiredEvidence: [
        "Incident classification criteria (what constitutes a serious incident)",
        "Internal escalation runbook with named contacts",
        "Evidence of at least one tabletop exercise",
        "National authority notification template",
      ],
      suggestedDocuments: ["Risk Management Plan", "AI Policy"],
      priority: isHigh ? "high" : "low",
      effort: "S",
    },
  ];

  return JSON.stringify({
    roadmapItems: items,
    prioritySummary: prioritySummaryMap[risk] ?? prioritySummaryMap["minimal"],
  });
}

// ─── Agent ────────────────────────────────────────────────────────────────────

type Input = {
  basics: BasicInfo;
  classification: ClassificationAgentResponse;
  legal: LegalAgentResponse;
};

class ComplianceAgent extends BaseAgent<Input, ComplianceAgentResponse> {
  readonly name = "Compliance";
  readonly systemPrompt = COMPLIANCE_SYSTEM;
  protected readonly schema = ComplianceAgentResponseSchema;

  protected buildPrompt({ basics, classification, legal }: Input): string {
    return buildCompliancePrompt(basics, classification, legal);
  }

  protected mockResponse(prompt: string): Promise<string> {
    return mockCompliance(prompt);
  }
}

export const complianceAgent = new ComplianceAgent();
