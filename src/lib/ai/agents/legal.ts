import type { BasicInfo, QAEntry } from "@/lib/types";
import {
  LegalAgentResponseSchema,
  type LegalAgentResponse,
  type ClassificationAgentResponse,
} from "../schema";
import { LEGAL_SYSTEM, buildLegalPrompt } from "../prompts";
import { BaseAgent } from "./base";

// ─── Mock ─────────────────────────────────────────────────────────────────────

function extractRisk(prompt: string): string {
  return prompt.match(/Risk:\s*(\w+)/)?.[1] ?? "limited";
}

function extractAnswerFlag(prompt: string, keyword: string): boolean {
  const qaSection = prompt.match(/## Interview Answers([\s\S]*?)(?:##|$)/)?.[1] ?? "";
  return qaSection.toLowerCase().includes(keyword);
}

async function mockLegal(prompt: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 350));
  const risk = extractRisk(prompt);
  const hasContentGen = extractAnswerFlag(prompt, "synthetic content") && prompt.includes("yes");
  const hasHumanInteraction = extractAnswerFlag(prompt, "interact directly") && prompt.includes("yes");

  const articlesByRisk: Record<string, Array<{ article: string; title: string; reason: string }>> = {
    unacceptable: [
      {
        article: "Art. 5",
        title: "Prohibited AI Practices",
        reason: "Real-time remote biometric identification in publicly accessible spaces is prohibited except in narrow law-enforcement cases.",
      },
      {
        article: "Art. 5(1)(a)",
        title: "Subliminal Manipulation",
        reason: "Systems that manipulate persons through subliminal techniques are prohibited.",
      },
    ],
    high: [
      {
        article: "Annex III",
        title: "High-Risk Use Case",
        reason: "The system falls within a listed high-risk category and must comply with Chapter III obligations.",
      },
      {
        article: "Art. 9",
        title: "Risk Management System",
        reason: "High-risk AI systems must establish and maintain a continuous risk management process throughout the lifecycle.",
      },
      {
        article: "Art. 10",
        title: "Data and Data Governance",
        reason: "Training, validation, and test datasets must meet quality criteria and be assessed for bias.",
      },
      {
        article: "Art. 11",
        title: "Technical Documentation",
        reason: "Providers must compile Annex IV technical documentation before market placement.",
      },
      {
        article: "Art. 13",
        title: "Transparency and Provision of Information",
        reason: "High-risk AI systems must be sufficiently transparent for deployers to interpret output.",
      },
      {
        article: "Art. 14",
        title: "Human Oversight",
        reason: "Effective human oversight measures must be built into the system design.",
      },
      {
        article: "Art. 15",
        title: "Accuracy, Robustness and Cybersecurity",
        reason: "High-risk systems must achieve appropriate levels of accuracy and be resilient to adversarial attacks.",
      },
      {
        article: "Art. 48",
        title: "EU Declaration of Conformity",
        reason: "Providers must issue a declaration of conformity before market placement.",
      },
      {
        article: "Art. 72",
        title: "Post-market Monitoring",
        reason: "Providers must actively monitor systems after deployment and report serious incidents.",
      },
    ],
    gpai: [
      {
        article: "Art. 53",
        title: "Obligations for GPAI Model Providers",
        reason: "Must prepare and keep up-to-date technical documentation and make it available to downstream providers.",
      },
      {
        article: "Art. 53(1)(b)",
        title: "Training Data Transparency",
        reason: "Must provide a sufficiently detailed summary of training data for copyright compliance.",
      },
      {
        article: "Art. 54",
        title: "Authorised Representatives",
        reason: "Non-EU GPAI model providers must designate an EU authorised representative.",
      },
      {
        article: "Art. 55",
        title: "Systemic Risk Obligations",
        reason: "Models with systemic risk (>10^25 FLOPs) must perform adversarial testing and report incidents to the Commission.",
      },
    ],
    limited: [
      {
        article: "Art. 50(1)",
        title: "Transparency — Conversational AI",
        reason: "Users must be informed they are interacting with an AI system, except in obvious contexts.",
      },
      {
        article: "Art. 4",
        title: "AI Literacy",
        reason: "Providers and deployers must ensure sufficient AI literacy among staff.",
      },
    ],
    minimal: [
      {
        article: "Art. 4",
        title: "AI Literacy",
        reason: "All providers and deployers must ensure sufficient AI literacy among staff operating the system.",
      },
      {
        article: "Art. 95",
        title: "Codes of Conduct",
        reason: "Voluntary codes of conduct are encouraged for minimal-risk AI systems.",
      },
    ],
  };

  const articles = [...(articlesByRisk[risk] ?? articlesByRisk["minimal"])];

  if (hasContentGen) {
    articles.push({
      article: "Art. 50(2)",
      title: "Transparency — Synthetic Content",
      reason: "AI-generated synthetic content must be machine-detectable and disclosed to users.",
    });
  }
  if (hasHumanInteraction && risk !== "unacceptable") {
    articles.push({
      article: "Art. 50(1)",
      title: "Disclosure of AI Interaction",
      reason: "Users must be informed when they interact with an AI system.",
    });
  }

  const obligationsByRisk: Record<string, string[]> = {
    unacceptable: [
      "Cease or fundamentally redesign the system before any EU deployment",
      "Conduct a prohibited-use legal review with qualified EU AI Act counsel",
      "Document the grounds for any claimed law-enforcement exception (Art. 5(2)–(6))",
    ],
    high: [
      "Establish a documented risk management system covering the full lifecycle (Art. 9)",
      "Implement data governance procedures for training and test data (Art. 10)",
      "Compile Annex IV technical documentation before market entry (Art. 11)",
      "Ensure transparency to deployers through instructions for use (Art. 13)",
      "Design and document human oversight measures (Art. 14)",
      "Define and maintain accuracy and robustness KPIs (Art. 15)",
      "Register the system in the EU AI Act public database (Art. 71)",
      "Issue EU Declaration of Conformity and affix CE marking (Art. 48)",
      "Implement post-market monitoring plan (Art. 72)",
    ],
    gpai: [
      "Publish technical documentation on model capabilities and limitations (Art. 53)",
      "Provide training data summary for copyright compliance (Art. 53(1)(b))",
      "Publish an acceptable use policy for downstream deployers",
      "Designate an EU authorised representative if established outside the EU (Art. 54)",
      "Perform adversarial testing if the model exceeds 10^25 FLOPs (Art. 55)",
    ],
    limited: [
      "Disclose AI interaction to users (Art. 50(1))",
      "Label AI-generated synthetic content with machine-readable markers (Art. 50(2))",
      "Maintain an AI literacy programme for all relevant staff (Art. 4)",
    ],
    minimal: [
      "Maintain an AI literacy programme for all relevant staff (Art. 4)",
      "Consider adopting a voluntary code of conduct (Art. 95)",
      "Document intended purpose and foreseeable misuse scenarios",
    ],
  };

  const docsByRisk: Record<string, string[]> = {
    unacceptable: ["AI Policy", "AI Inventory"],
    high: ["Risk Management Plan", "Technical Documentation", "Human Oversight Procedure", "AI Inventory", "AI Literacy Plan"],
    gpai: ["Technical Documentation", "AI Policy", "AI Inventory"],
    limited: ["AI Policy", "AI Literacy Plan", "AI Inventory"],
    minimal: ["AI Policy", "AI Inventory"],
  };

  return JSON.stringify({
    applicableArticles: articles,
    obligations: obligationsByRisk[risk] ?? obligationsByRisk["minimal"],
    exemptions: risk === "unacceptable" ? ["Law enforcement biometric ID exemption applies only under strict conditions in Art. 5(2)–(6)."] : [],
    recommendedDocuments: docsByRisk[risk] ?? docsByRisk["minimal"],
  });
}

// ─── Agent ────────────────────────────────────────────────────────────────────

type Input = {
  basics: BasicInfo;
  answers: QAEntry[];
  classification: ClassificationAgentResponse;
};

class LegalAgent extends BaseAgent<Input, LegalAgentResponse> {
  readonly name = "Legal";
  readonly systemPrompt = LEGAL_SYSTEM;
  protected readonly schema = LegalAgentResponseSchema;

  protected buildPrompt({ basics, answers, classification }: Input): string {
    return buildLegalPrompt(basics, answers, classification);
  }

  protected mockResponse(prompt: string): Promise<string> {
    return mockLegal(prompt);
  }
}

export const legalAgent = new LegalAgent();
