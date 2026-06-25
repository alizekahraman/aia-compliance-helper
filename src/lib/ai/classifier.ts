import type { BasicInfo, ClassificationResult, QAEntry, RoadmapItem } from "@/lib/types";

/**
 * Mock classifier. Swap the body of `classifyAssessment` with an LLM call
 * (Lovable AI Gateway or any provider) without changing call sites.
 */
export async function classifyAssessment(
  basics: BasicInfo,
  answers: QAEntry[],
): Promise<ClassificationResult> {
  await delay(450);
  const a = Object.fromEntries(answers.map((x) => [x.questionId, x.answer]));

  const articles: ClassificationResult["articles"] = [];
  let risk: ClassificationResult["risk"] = "limited";
  let confidence = 0.7;
  const missing: string[] = [];

  if (a["biometric"] === "yes-realtime") {
    risk = "unacceptable";
    confidence = 0.92;
    articles.push({
      article: "Art. 5",
      title: "Prohibited AI Practices",
      reason:
        "Real-time remote biometric identification in publicly accessible spaces is prohibited except in narrow law-enforcement cases.",
    });
  } else if (a["recruitment"] === "yes" || a["biometric"] === "yes-post") {
    risk = "high";
    confidence = 0.88;
    articles.push({
      article: "Annex III",
      title: "High-risk use case",
      reason:
        a["recruitment"] === "yes"
          ? "Systems for recruitment or worker evaluation are listed as high-risk."
          : "Post-event biometric categorization falls under Annex III high-risk systems.",
    });
  } else if (a["decisions"] === "yes") {
    risk = "high";
    confidence = 0.78;
    articles.push({
      article: "Annex III",
      title: "Decisions affecting natural persons",
      reason:
        "Systems that materially influence access to services, credit, benefits, or essential rights are classified as high-risk.",
    });
  }

  if (risk === "high") {
    articles.push(
      {
        article: "Art. 9",
        title: "Risk Management System",
        reason: "High-risk systems require a continuous, documented risk management process.",
      },
      {
        article: "Art. 10",
        title: "Data and Data Governance",
        reason: "Training, validation and testing data must meet quality and bias-mitigation criteria.",
      },
      {
        article: "Art. 14",
        title: "Human Oversight",
        reason: "Effective human oversight measures must be designed into the system.",
      },
      {
        article: "Art. 15",
        title: "Accuracy, Robustness, Cybersecurity",
        reason: "Appropriate level of accuracy, robustness and security must be ensured.",
      },
    );
  }

  if (a["content-generation"] === "yes") {
    articles.push({
      article: "Art. 50",
      title: "Transparency for Generated Content",
      reason: "Synthetic content must be machine-detectable and disclosed to users.",
    });
    if (risk === "limited") confidence = 0.82;
  }

  if (a["human-interaction"] === "yes") {
    articles.push({
      article: "Art. 50(1)",
      title: "Disclosure of AI Interaction",
      reason: "Users must be informed that they are interacting with an AI system.",
    });
  }

  if (a["gpai"] === "foundation") {
    risk = "gpai";
    confidence = 0.9;
    articles.push({
      article: "Art. 53–55",
      title: "GPAI Provider Obligations",
      reason:
        "Providers of General Purpose AI models must publish technical documentation, training data summaries, and copyright compliance policy.",
    });
  }

  if (a["override"] !== "yes") {
    missing.push("Clarify the user contestation / override workflow.");
    confidence -= 0.05;
  }
  if (a["monitoring"] === "none") {
    missing.push("Assign an accountable owner for production monitoring.");
    confidence -= 0.05;
  }
  if (!basics.industry) missing.push("Industry context refines applicable sector guidance.");

  if (articles.length === 0) {
    articles.push({
      article: "Art. 4",
      title: "AI Literacy",
      reason:
        "All providers and deployers must ensure sufficient AI literacy among staff operating the system.",
    });
  }

  const rationale = buildRationale(risk, basics);
  return {
    risk,
    confidence: Math.max(0.4, Math.min(0.98, confidence)),
    rationale,
    articles,
    missingInfo: missing,
  };
}

function buildRationale(risk: ClassificationResult["risk"], basics: BasicInfo): string {
  const role = basics.role === "provider" ? "as a provider" : "as a deployer";
  switch (risk) {
    case "unacceptable":
      return `Based on the answers, ${basics.systemName} appears to fall within a prohibited practice under the EU AI Act. Operating this system ${role} in the EU is not permitted in its current form.`;
    case "high":
      return `${basics.systemName} appears to be a high-risk AI system ${role}. It must meet the full Chapter III obligations before being placed on the EU market.`;
    case "gpai":
      return `${basics.systemName} qualifies as a General Purpose AI model. GPAI-specific obligations apply in addition to use-case rules for downstream deployers.`;
    case "limited":
      return `${basics.systemName} is most likely a limited-risk AI system ${role}. Transparency obligations apply, but no conformity assessment is required.`;
    default:
      return `${basics.systemName} appears to be a minimal-risk system. Voluntary codes of conduct are recommended.`;
  }
}

export async function generateRoadmap(
  basics: BasicInfo,
  classification: ClassificationResult,
): Promise<RoadmapItem[]> {
  await delay(400);
  const high = classification.risk === "high" || classification.risk === "gpai";
  const base: Omit<RoadmapItem, "id" | "status">[] = [
    {
      category: "Risk Management",
      title: "Establish a continuous AI risk management process",
      description: "Define, document, and review risks across the lifecycle of the system.",
      why: "Required by Art. 9 for high-risk systems; baseline good practice otherwise.",
      priority: high ? "critical" : "high",
      effort: "L",
    },
    {
      category: "Risk Management",
      title: "Maintain a risk register with mitigations",
      description: "Track identified risks, owners, severity, and residual risk after controls.",
      why: "Evidence of ongoing risk management for audits and notified body review.",
      priority: "high",
      effort: "M",
    },
    {
      category: "Data Governance",
      title: "Document training, validation and test datasets",
      description: "Provenance, representativeness, known limitations and bias assessments.",
      why: "Art. 10 requires data governance practices for high-risk systems.",
      priority: high ? "critical" : "medium",
      effort: "L",
    },
    {
      category: "Data Governance",
      title: "Run bias and fairness evaluation",
      description: "Quantitative checks across protected groups with documented thresholds.",
      why: "Reduces discriminatory outcomes; expected evidence in conformity assessment.",
      priority: "high",
      effort: "M",
    },
    {
      category: "Technical Documentation",
      title: "Compile Annex IV technical documentation",
      description: "System description, design choices, performance metrics and known limitations.",
      why: "Mandatory documentation for high-risk providers before market entry.",
      priority: high ? "critical" : "medium",
      effort: "XL",
    },
    {
      category: "Human Oversight",
      title: "Design and document human-in-the-loop controls",
      description: "Define when and how operators can intervene, override or stop the system.",
      why: "Art. 14 requires effective human oversight measures.",
      priority: high ? "critical" : "high",
      effort: "M",
    },
    {
      category: "Human Oversight",
      title: "Train operators on system limitations",
      description: "Provide tailored training so reviewers can spot failure modes.",
      why: "Oversight is only effective if humans understand the model's edge cases.",
      priority: "medium",
      effort: "S",
    },
    {
      category: "Accuracy & Robustness",
      title: "Define accuracy and robustness KPIs",
      description: "Set measurable targets and monitor drift over time.",
      why: "Art. 15 requires declared and consistent performance.",
      priority: "high",
      effort: "M",
    },
    {
      category: "Cybersecurity",
      title: "Threat-model the AI system",
      description: "Cover prompt injection, model theft, data poisoning and inference attacks.",
      why: "Art. 15 explicitly requires resilience to attempts to alter use or performance.",
      priority: high ? "high" : "medium",
      effort: "M",
    },
    {
      category: "Transparency",
      title: "Disclose AI interaction to end-users",
      description: "Add clear UI labels when users interact with the system or receive AI output.",
      why: "Art. 50 transparency obligation for AI that interacts with people or generates content.",
      priority: "high",
      effort: "S",
    },
    {
      category: "Transparency",
      title: "Watermark or label generated content",
      description: "Apply machine-readable markers and visible disclosure for synthetic media.",
      why: "Required for generative systems under Art. 50.",
      priority: classification.articles.some((x) => x.article === "Art. 50") ? "high" : "low",
      effort: "M",
    },
    {
      category: "Post-market Monitoring",
      title: "Set up post-market monitoring plan",
      description: "Log incidents, performance changes and user complaints with review cadence.",
      why: "Art. 72 requires providers to actively monitor systems after deployment.",
      priority: high ? "critical" : "medium",
      effort: "M",
    },
    {
      category: "Post-market Monitoring",
      title: "Define serious incident reporting workflow",
      description: "Process to notify national authorities within statutory deadlines.",
      why: "Art. 73 mandates timely reporting of serious incidents.",
      priority: high ? "high" : "low",
      effort: "S",
    },
  ];
  return base.map((b, i) => ({
    ...b,
    id: `rm-${i}-${Math.random().toString(36).slice(2, 7)}`,
    status: "not-started",
  }));
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}