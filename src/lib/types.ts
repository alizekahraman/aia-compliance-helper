export type RiskLevel = "minimal" | "limited" | "high" | "unacceptable" | "gpai";

export interface BasicInfo {
  systemName: string;
  description: string;
  industry: string;
  role: "provider" | "deployer";
  audience: "internal" | "customer-facing";
  region: string;
}

export interface QAEntry {
  questionId: string;
  question: string;
  answer: string;
}

export interface ApplicableArticle {
  article: string;
  title: string;
  reason: string;
}

export interface ClassificationResult {
  risk: RiskLevel;
  confidence: number;
  rationale: string;
  articles: ApplicableArticle[];
  missingInfo: string[];
}

export type RoadmapCategory =
  | "Governance"
  | "Documentation"
  | "Technical Controls"
  | "Human Oversight"
  | "Data Governance"
  | "Cybersecurity"
  | "Transparency"
  | "Monitoring";

export interface RoadmapItem {
  id: string;
  category: RoadmapCategory;
  title: string;
  description: string;
  why: string;
  article?: string;
  responsibleRole?: string;
  requiredEvidence?: string[];
  suggestedDocuments?: string[];
  priority: "low" | "medium" | "high" | "critical";
  effort: "S" | "M" | "L" | "XL";
  status: "not-started" | "in-progress" | "complete";
}

export interface Assessment {
  id: string;
  createdAt: string;
  basics: BasicInfo;
  answers: QAEntry[];
  classification: ClassificationResult | null;
  roadmap: RoadmapItem[];
}

export type DocumentTemplate =
  | "Risk Management Plan"
  | "AI Policy"
  | "Technical Documentation"
  | "Human Oversight Procedure"
  | "AI Inventory"
  | "AI Literacy Plan";

export interface GeneratedDocument {
  id: string;
  template: DocumentTemplate;
  assessmentId: string | null;
  systemName: string;
  createdAt: string;
  content: string;
}