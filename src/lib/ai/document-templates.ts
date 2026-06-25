/**
 * Rich document templates for all six EU AI Act compliance documents.
 *
 * Each template function receives the assessment context and returns structured
 * Markdown with [PLACEHOLDER: description] markers where user input is needed.
 * Content varies by risk level so high-risk systems get the mandatory sections.
 *
 * These templates are used by the DocumentationAgent mock and inform the LLM
 * prompt when a real API key is present.
 */

import type { Assessment } from "@/lib/types";

// ─── Context helper ───────────────────────────────────────────────────────────

export interface DocContext {
  name: string;
  description: string;
  industry: string;
  role: string;
  risk: string;
  today: string;
  articles: string; // comma-separated list
  isHigh: boolean;
  isGPAI: boolean;
  isUnacceptable: boolean;
}

export function buildContext(assessment: Assessment | null): DocContext {
  const name = assessment?.basics.systemName ?? "Your AI System";
  const risk = assessment?.classification?.risk ?? "limited";
  const articles =
    assessment?.classification?.articles.map((a) => a.article).join(", ") ?? "";
  return {
    name,
    description: assessment?.basics.description ?? "",
    industry: assessment?.basics.industry ?? "General",
    role: assessment?.basics.role ?? "provider",
    risk,
    today: new Date().toISOString().slice(0, 10),
    articles,
    isHigh: risk === "high",
    isGPAI: risk === "gpai",
    isUnacceptable: risk === "unacceptable",
  };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function ph(description: string) {
  return `[PLACEHOLDER: ${description}]`;
}

// ─── 1. Risk Management Plan ──────────────────────────────────────────────────

export function riskManagementPlan(ctx: DocContext): string {
  return `# Risk Management Plan

**System:** ${ctx.name}
**Industry:** ${ctx.industry}
**Role:** ${ctx.role}
**Risk classification:** ${ctx.risk}
**Prepared by:** ${ph("Name and title of document author")}
**Approved by:** ${ph("Name and title of approving officer")}
**Effective date:** ${ctx.today}
**Next review date:** ${ph("Date — recommended: 12 months from effective date")}
**Document version:** 1.0
**Storage location:** ${ph("Document management system path or URL")}

---

## 1. Purpose

This Risk Management Plan establishes a systematic, continuous process for identifying, analysing, evaluating and treating risks associated with **${ctx.name}** throughout its entire lifecycle, in accordance with ${ctx.isHigh ? "Article 9 of the EU AI Act (mandatory for high-risk systems)" : "EU AI Act best practice guidance"}.

## 2. Scope

### 2.1 In Scope

This plan covers all phases of the system lifecycle:

- Design and requirements specification
- Training data selection and preparation
- Model development and validation
- Pre-deployment testing and conformity assessment
- Production operation and monitoring
- Change management and retraining
- Decommissioning and data deletion

### 2.2 Out of Scope

${ph("List any systems, processes, geographies, or use cases explicitly excluded from this plan")}

### 2.3 Related Documents

| Document | Location | Owner |
|----------|----------|-------|
| Technical Documentation | ${ph("Link or path")} | ${ph("Owner")} |
| Human Oversight Procedure | ${ph("Link or path")} | ${ph("Owner")} |
| Data Governance Policy | ${ph("Link or path")} | ${ph("Owner")} |
| Incident Response Procedure | ${ph("Link or path")} | ${ph("Owner")} |

---

## 3. Risk Management Process

The risk management process for **${ctx.name}** follows four iterative phases.

### 3.1 Risk Identification

Risks are identified through:

- Structured risk workshops with cross-functional teams (quarterly minimum)
- Foreseeable misuse scenario analysis
- Fundamental rights impact assessment
- Adversarial testing and red-teaming results
- Post-market incident and near-miss data
- Stakeholder feedback and user complaints
- Regulatory guidance updates from national AI authorities

### 3.2 Risk Analysis

Each identified risk is characterised on two dimensions:

| Dimension | Scale | Description |
|-----------|-------|-------------|
| Likelihood | 1 – 5 | 1 = rare / very unlikely; 5 = almost certain |
| Severity | 1 – 5 | 1 = negligible harm; 5 = catastrophic, irreversible harm |
| Risk Score | L × S | Inherent (pre-controls) risk |

### 3.3 Risk Evaluation

**Risk appetite thresholds for ${ctx.name}:**

| Score | Level | Required Action |
|-------|-------|-----------------|
| 1 – 4 | Low | Accept; monitor at scheduled review |
| 5 – 9 | Medium | Mitigate within ${ph("timeframe, e.g. 90 days")} |
| 10 – 19 | High | Mitigate before deployment or next release |
| 20 – 25 | Critical | Block deployment; escalate immediately to ${ph("executive role")} |

**Residual risk acceptance threshold:** ${ph("Define the maximum acceptable residual risk score, e.g. ≤ 6")}

### 3.4 Risk Treatment

For each medium/high/critical risk, the following must be documented:

1. **Technical controls** — model-level or infrastructure mitigations
2. **Procedural controls** — human processes that reduce risk
3. **Monitoring mechanisms** — how residual risk is tracked in production
4. **Review trigger** — condition that would require re-evaluation

---

## 4. Risk Register

${ctx.isHigh ? `> **Note:** For high-risk AI systems, Article 9 requires the risk register to be maintained throughout the system lifecycle and made available to notified bodies and national authorities on request.` : ""}

| ID | Category | Description | Likelihood | Severity | Score | Owner | Technical Controls | Procedural Controls | Residual Score | Status |
|----|----------|-------------|-----------|---------|-------|-------|-------------------|--------------------|--------------:|--------|
| R-001 | ${ph("Category, e.g. Bias")} | ${ph("Describe the risk in 1–2 sentences")} | ${ph("1–5")} | ${ph("1–5")} | ${ph("L×S")} | ${ph("Name")} | ${ph("Technical mitigation")} | ${ph("Procedural mitigation")} | ${ph("Score")} | Open |
| R-002 | Bias & Fairness | System outputs systematically disadvantage a protected group (age, gender, ethnicity, disability) | 3 | 5 | 15 | ${ph("Bias Lead")} | Quarterly fairness evaluation on held-out test sets; enforced fairness thresholds in model pipeline | Human review of all borderline decisions; bias incident escalation path | ${ph("Residual score after controls")} | Open |
| R-003 | Data Drift | Model performance degrades as the real-world distribution shifts from training data | 3 | 3 | 9 | ${ph("ML Engineer")} | Monthly distribution shift detection; automated alerts when PSI > 0.2 | Retraining trigger protocol; model freeze pending review | ${ph("Residual score")} | Open |
| R-004 | Adversarial Attack | Malicious actors probe the system to extract model logic or manipulate outputs | 2 | 4 | 8 | ${ph("Security Lead")} | Input validation; rate limiting; anomaly detection on inference requests | Penetration testing schedule; red-team exercises bi-annually | ${ph("Residual score")} | Open |
| R-005 | ${ph("Category")} | ${ph("Add additional risks specific to this system's context")} | ${ph("1–5")} | ${ph("1–5")} | ${ph("L×S")} | ${ph("Owner")} | ${ph("Controls")} | ${ph("Controls")} | ${ph("Score")} | Open |

*Minimum 5 risk entries are expected for Annex IV conformity assessment. Add rows as needed.*

---

## 5. Residual Risk Acceptance

Risks reduced below the acceptance threshold but not eliminated must be formally accepted.

**Authorised accepting officer:** ${ph("Full name and title — this person takes legal accountability for residual risk")}

**Acceptance statement:** I confirm that the residual risks documented in this register have been reviewed, controls are adequate, and the system is approved for ${ph("deployment / continued operation")}.

**Signature and date:** ${ph("Wet signature or electronic signature reference")}

---

## 6. Monitoring and Review

### 6.1 Scheduled Reviews

| Review Type | Frequency | Lead | Participants | Output |
|-------------|-----------|------|--------------|--------|
| Risk register update | Monthly | ${ph("Risk Lead")} | Engineering, Product | Updated register |
| Full risk re-assessment | Quarterly | ${ph("Risk Lead")} | Cross-functional | Updated plan |
| Post-incident review | Within 72 h of incident | ${ph("System Owner")} | Incident team | Corrective action plan |
| Annual policy review | Annually | ${ph("Compliance Lead")} | Legal, Engineering | Approved revision |

### 6.2 Triggers for Unscheduled Review

This plan must be reviewed immediately upon:

- Significant model update, retraining, or architecture change
- Change in deployment environment, user population, or intended purpose
- Any incident or near-miss affecting a protected group or causing material harm
- New enforcement guidance from ${ph("national AI supervisory authority, e.g. BaFin (DE), CNIL (FR), ICO (UK)")}
- Material change in applicable law or regulatory guidance
- ${ph("Add organisation-specific triggers")}

---

## 7. Roles and Responsibilities

| Role | Current Holder | Key Obligations |
|------|---------------|-----------------|
| AI System Owner | ${ph("Name")} | Overall accountability; residual risk acceptance; policy compliance |
| Risk Lead | ${ph("Name")} | Maintains this register; coordinates risk workshops; escalates high risks |
| Engineering Lead | ${ph("Name")} | Implements technical controls; validates mitigations are effective |
| Legal / Compliance | ${ph("Name")} | Regulatory interpretation; interface with national authorities |
| Data Protection Officer | ${ph("Name — required if personal data processed")} | GDPR interplay; data protection risk assessment |
| CISO / Security Lead | ${ph("Name")} | Adversarial risk assessment; cybersecurity controls |

---

## 8. Document Control

| Version | Date | Author | Approved by | Summary of Changes |
|---------|------|--------|-------------|-------------------|
| 1.0 | ${ctx.today} | ${ph("Author name")} | ${ph("Approver name")} | Initial release |
| | | | | |`;
}

// ─── 2. Technical Documentation (Annex IV) ───────────────────────────────────

export function technicalDocumentation(ctx: DocContext): string {
  return `# Technical Documentation
*EU AI Act — Annex IV*

**System:** ${ctx.name}
**Industry:** ${ctx.industry}
**Role:** ${ctx.role}
**Risk classification:** ${ctx.risk}
**Applicable articles:** ${ctx.articles || ph("List applicable articles")}
**Document owner:** ${ph("Name and title")}
**Effective date:** ${ctx.today}
**Version:** 1.0

---

## 1. General Description of the AI System

### 1.1 Intended Purpose

${ctx.description || ph("Describe in detail what the system does, the specific task it performs, and the problem it solves. Include the operational context.")}

**Intended use cases:**

${ph("List 3–5 specific use cases this system is designed for")}

**Uses explicitly NOT intended (foreseeable misuse):**

${ph("List use cases this system must not be used for, including misuse scenarios considered during design")}

### 1.2 Intended Users and Affected Persons

| Category | Description |
|----------|-------------|
| Deployers | ${ph("Who deploys and operates the system")} |
| End-users | ${ph("Who interacts with the system directly")} |
| Affected persons | ${ph("Who is affected by the system's outputs but may not interact with it directly")} |

### 1.3 Deployment Environment

- **Primary environment:** ${ph("Cloud / on-premise / hybrid — specify platforms")}
- **Geographic scope:** ${ctx.industry ? ctx.industry + " sector, " : ""}${ph("list regions / countries where deployed")}
- **Integration points:** ${ph("Other systems this AI integrates with")}
- **Scale of deployment:** ${ph("Number of users, transactions per day, etc.")}

---

## 2. AI System Components and Architecture

### 2.1 System Architecture Overview

${ph("Insert or describe the architecture diagram. Include: data ingestion, feature engineering, model inference, output delivery, monitoring.")}

### 2.2 Model Details

| Property | Value |
|----------|-------|
| Model family | ${ph("e.g. transformer, gradient boosting, neural network")} |
| Framework | ${ph("e.g. PyTorch 2.1, scikit-learn 1.3, TensorFlow 2.14")} |
| Model version | ${ph("Version tag, e.g. v3.2.1")} |
| Parameter count | ${ph("Number of parameters, if applicable")} |
| Third-party foundation model | ${ph("Name and version, or 'None'")} |

### 2.3 Third-Party Components

| Component | Provider | Version | Purpose | Licence |
|-----------|----------|---------|---------|---------|
| ${ph("Component name")} | ${ph("Provider")} | ${ph("Version")} | ${ph("Purpose")} | ${ph("Licence")} |

### 2.4 Infrastructure

- **Compute:** ${ph("CPU / GPU specs, cloud provider and region")}
- **Storage:** ${ph("Data storage technology and location")}
- **API / serving layer:** ${ph("Inference serving framework, e.g. FastAPI, Triton")}

---

## 3. Training Data and Data Governance

> *Article 10 requires high-risk AI systems to use data that is relevant, sufficiently representative, free of errors, and complete.*

### 3.1 Training Dataset(s)

| Dataset | Source | Size | Collection period | Licence / rights |
|---------|--------|------|------------------|------------------|
| ${ph("Dataset name")} | ${ph("Source")} | ${ph("Rows / GB")} | ${ph("From – to")} | ${ph("Licence")} |

### 3.2 Validation and Test Sets

| Split | Size | Selection method | Notes |
|-------|------|-----------------|-------|
| Validation | ${ph("N samples")} | ${ph("Method, e.g. random stratified")} | ${ph("Notes")} |
| Test | ${ph("N samples")} | ${ph("Method")} | ${ph("Notes")} |

### 3.3 Data Preprocessing

${ph("Describe preprocessing steps: tokenisation, normalisation, feature engineering, imputation, deduplication.")}

### 3.4 Data Quality and Bias Assessment

- **Representativeness assessment:** ${ph("How was representativeness across demographic groups verified?")}
- **Known limitations:** ${ph("Describe any known gaps, biases, or under-represented groups in the training data")}
- **Bias mitigations applied:** ${ph("List specific technical measures taken to address identified biases")}
- **Labelling methodology:** ${ph("Describe annotation process, annotator qualifications, inter-annotator agreement measures")}

### 3.5 Data Retention and Deletion

- **Retention period:** ${ph("How long is training data retained and under what legal basis")}
- **Deletion schedule:** ${ph("When and how training data is deleted")}
- **Data minimisation measures:** ${ph("Describe minimisation steps taken")}

---

## 4. Performance Metrics

### 4.1 Primary Performance Metrics

| Metric | Target | Achieved (validation) | Achieved (test) | Measurement method |
|--------|--------|-----------------------|-----------------|-------------------|
| ${ph("Primary metric, e.g. Accuracy")} | ${ph("≥ X%")} | ${ph("Value")} | ${ph("Value")} | ${ph("Method")} |
| ${ph("Secondary metric")} | ${ph("Target")} | ${ph("Value")} | ${ph("Value")} | ${ph("Method")} |

### 4.2 Fairness and Non-Discrimination Metrics

| Metric | Protected Attribute | Group A | Group B | Acceptable Gap |
|--------|--------------------|---------|---------|----|
| ${ph("e.g. Selection rate")} | ${ph("e.g. Gender")} | ${ph("Value")} | ${ph("Value")} | ${ph("≤ X%")} |
| ${ph("e.g. False positive rate")} | ${ph("e.g. Ethnicity")} | ${ph("Value")} | ${ph("Value")} | ${ph("≤ X%")} |

> *[PLACEHOLDER: Document how metrics were measured and how thresholds were determined. Reference the fairness definition used (e.g. demographic parity, equalised odds).]*

### 4.3 Robustness Testing

| Test Type | Method | Result | Pass/Fail |
|-----------|--------|--------|-----------|
| Out-of-distribution | ${ph("Method")} | ${ph("Result")} | ${ph("Pass/Fail")} |
| Adversarial inputs | ${ph("Method")} | ${ph("Result")} | ${ph("Pass/Fail")} |
| Edge cases | ${ph("Method")} | ${ph("Result")} | ${ph("Pass/Fail")} |

---

## 5. Risk Management Summary

> *Cross-reference to the Risk Management Plan.*

**Current residual risk level:** ${ph("Low / Medium / High — from risk register")}

**Top 3 residual risks:**

1. ${ph("Risk description and residual score")}
2. ${ph("Risk description and residual score")}
3. ${ph("Risk description and residual score")}

**Link to Risk Management Plan:** ${ph("Document path or URL")}

---

## 6. Human Oversight Measures

> *Article 14 requires appropriate human oversight measures to be built into the system.*

- **Oversight model:** ${ph("Describe whether human-in-the-loop, human-on-the-loop, or human-in-command")}
- **Override capability:** ${ph("Describe how humans can override or stop the system")}
- **Confidence thresholds:** ${ph("Define thresholds below which outputs are flagged for human review")}
- **Logging of interventions:** ${ph("How human overrides are logged and reviewed")}

Full details: see **Human Oversight Procedure** at ${ph("link")}.

---

## 7. Cybersecurity Measures

> *Article 15 requires appropriate cybersecurity measures.*

- **Threat model reference:** ${ph("Link to threat model document or describe key threats addressed")}
- **Input validation:** ${ph("Describe validation and sanitisation of model inputs")}
- **Access controls:** ${ph("Who can access the model endpoint, training data, and output logs")}
- **Encryption:** ${ph("Data-at-rest and in-transit encryption standards used")}
- **Penetration testing:** ${ph("Frequency and scope of security testing")}

---

## 8. Monitoring and Post-Market Surveillance

> *Article 72 requires providers to implement a post-market monitoring plan.*

- **Monitoring dashboard:** ${ph("Link to monitoring dashboard")}
- **Metrics monitored in production:** ${ph("List key metrics tracked continuously")}
- **Alerting thresholds:** ${ph("Define thresholds that trigger alerts")}
- **Incident reporting process:** ${ph("Reference to incident response procedure")}

---

## 9. Changes and Version History

| Version | Date | Change Description | Author | Approved by |
|---------|------|--------------------|--------|-------------|
| 1.0 | ${ctx.today} | Initial release | ${ph("Author")} | ${ph("Approver")} |
| | | | | |

---

## 10. Declarations

This technical documentation has been prepared in accordance with Annex IV of Regulation (EU) 2024/1689 (EU AI Act).

**Prepared by:** ${ph("Name, Title, Organisation")}

**Date:** ${ctx.today}`;
}

// ─── 3. Human Oversight Procedure ────────────────────────────────────────────

export function humanOversightProcedure(ctx: DocContext): string {
  return `# Human Oversight Procedure

**System:** ${ctx.name}
**Industry:** ${ctx.industry}
**Regulatory basis:** Article 14, EU AI Act
**Document owner:** ${ph("Name and title")}
**Effective date:** ${ctx.today}
**Review frequency:** Annual or after any material system change
**Version:** 1.0

---

## 1. Purpose

This procedure establishes the human oversight framework for **${ctx.name}**, ensuring that human beings can effectively understand, monitor, intervene in, and — where necessary — stop the system in accordance with Article 14 of the EU AI Act.

## 2. Roles and Responsibilities

| Role | Person / Team | Primary Responsibilities |
|------|--------------|--------------------------|
| System Owner | ${ph("Name")} | Ultimate accountability for system behaviour; escalation authority |
| Oversight Lead | ${ph("Name")} | Day-to-day management of the oversight framework; trains reviewers |
| Operator | ${ph("Team or role title")} | Front-line use of ${ctx.name} in daily operations |
| Reviewer | ${ph("Role title — must be qualified and independent of AI output")} | Reviews flagged AI outputs; documents and acts on override decisions |
| Data Protection Officer | ${ph("Name — if personal data is involved")} | Monitors for data rights implications of AI decisions |
| Escalation Authority | ${ph("Senior management role")} | Invokes stop authority; approves resumption after halt |

**Minimum qualification requirements for Reviewers:**

${ph("Describe the knowledge, experience, or training a reviewer must have before being authorised to review outputs of this specific system")}

---

## 3. Oversight Triggers

Human review is required in the following circumstances:

### 3.1 Automatic Triggers (System-Generated)

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Low confidence score | Below ${ph("threshold, e.g. 0.75")} | Flag to Reviewer queue automatically |
| Out-of-distribution input | Anomaly score > ${ph("threshold")} | Hold output; alert Reviewer |
| Sensitive attribute detected | ${ph("List attributes — e.g. vulnerable user flag")} | Mandatory human review before output delivery |
| Consecutive low-confidence outputs | ${ph("e.g. ≥ 3 in 10 minutes")} | Alert Oversight Lead |

### 3.2 User-Initiated Triggers

| Trigger | Response Time SLA | Escalation if Unresolved |
|---------|------------------|--------------------------|
| User requests review of decision | ${ph("e.g. within 24 hours")} | ${ph("Escalation path")} |
| User submits complaint or objection | ${ph("e.g. within 5 business days")} | ${ph("Escalation path")} |
| User reports discriminatory output | ${ph("e.g. within 4 hours")} | Immediate escalation to Oversight Lead |

### 3.3 Oversight Lead Triggers

The Oversight Lead may initiate a review at any time based on:

- Patterns identified in production monitoring
- Feedback from operators or affected persons
- External incident reports related to similar systems
- Regulatory guidance updates

---

## 4. Review and Override Procedure

### 4.1 Step-by-Step Process

1. **Notification** — Reviewer receives alert via ${ph("alert channel, e.g. email / Slack / case management system")}
2. **Access** — Reviewer accesses the original input, model output, and confidence metadata via ${ph("tool or dashboard name")}
3. **Assessment** — Reviewer evaluates whether the AI output is appropriate given the context
4. **Decision** — Reviewer either:
   - **Approves** the AI output (no change) — documents rationale
   - **Modifies** the output — documents change and rationale
   - **Rejects** the output — documents reason; alternative action taken
   - **Escalates** — if outside reviewer's competence or authority
5. **Logging** — Decision, rationale, and reviewer identity logged in ${ph("audit system / log location")}
6. **Feedback** — Cases where the AI was significantly wrong are flagged for model improvement review

### 4.2 Decision Authority

| Decision Type | Authority Level | Requires Co-signature |
|--------------|-----------------|----------------------|
| Routine override | Reviewer | No |
| Override affecting > ${ph("N")} people | Oversight Lead | Yes |
| Override in a protected characteristic case | Oversight Lead + DPO | Yes |
| Systemic override (pattern affecting entire cohort) | System Owner | Yes + Legal sign-off |

---

## 5. Stop Conditions and Kill-Switch

The system **must be halted immediately** if any of the following conditions occur:

- Systematic errors detected affecting a protected group (discrimination threshold: ${ph("define, e.g. ≥ 5% disparity in error rate")})
- Any incident meeting the definition of a Serious Incident under Article 3(49) of the EU AI Act
- Security breach affecting the integrity of model inputs or outputs
- ${ph("Organisation-specific stop conditions")}

**Kill-switch activation procedure:**

1. Any Reviewer, Operator, or Oversight Lead may initiate a halt by ${ph("describe the mechanism, e.g. calling a specific API endpoint, pressing a stop button in the dashboard")}
2. Halt takes effect within **${ph("target time, e.g. < 5 minutes")}** of activation
3. Oversight Lead and System Owner are notified immediately
4. System Owner confirms halt and initiates post-incident review within **${ph("time, e.g. 24 hours")}**
5. System may only be restarted by ${ph("who — e.g. System Owner + Oversight Lead jointly")} after root cause is identified and mitigated

---

## 6. Logging and Audit Trail

All oversight activities must be logged with:

| Field | Description |
|-------|-------------|
| Timestamp | UTC timestamp of the review |
| Reviewer ID | Authenticated identity of the reviewer |
| Case reference | Input and output identifiers |
| Decision | Approved / Modified / Rejected / Escalated |
| Rationale | Free-text explanation |
| Time to decision | Duration of review in minutes |

**Log retention period:** ${ph("e.g. 3 years — align with applicable data retention law")}

**Log access:** ${ph("Who can access the audit log — typically Compliance, DPO, and national authorities on request")}

---

## 7. Operator Training

### 7.1 Mandatory Training for Operators

${ph("Describe what training is required before a person is authorised to use the system")}

### 7.2 Mandatory Training for Reviewers

All Reviewers must complete:

| Module | Content | Duration | Frequency |
|--------|---------|---------|-----------|
| System onboarding | How ${ctx.name} works; known limitations; edge cases | ${ph("hours")} | Once |
| Override procedure | This procedure in detail; mock review exercises | ${ph("hours")} | Once; refresher annually |
| Bias recognition | How to spot discriminatory outputs | ${ph("hours")} | Annually |
| Incident reporting | What to report and how | 30 min | Annually |

**Training completion must be documented in:** ${ph("HR / LMS system name")}

---

## 8. Review of This Procedure

This procedure will be reviewed:

- Annually, or
- Within 30 days of any material system change, or
- Following any oversight failure or serious incident

**Next review date:** ${ph("Date")}

---

## 9. Document Control

| Version | Date | Author | Approved by | Changes |
|---------|------|--------|-------------|---------|
| 1.0 | ${ctx.today} | ${ph("Author")} | ${ph("Approver")} | Initial release |`;
}

// ─── 4. AI Policy ─────────────────────────────────────────────────────────────

export function aiPolicy(ctx: DocContext): string {
  return `# AI Policy

**Organisation:** ${ph("Legal name of your organisation")}
**Policy owner:** ${ph("Name, title, and department")}
**Approved by:** ${ph("Board / Senior Management / AI Steering Committee")}
**Effective date:** ${ctx.today}
**Review cycle:** Annual
**Version:** 1.0

---

## 1. Statement of Commitment

${ph("Organisation name")} is committed to developing, deploying, and using Artificial Intelligence systems that are lawful, ethical, transparent, and aligned with the values of our organisation and the communities we serve. This commitment is grounded in the EU AI Act (Regulation (EU) 2024/1689), the GDPR, and our own standards.

We recognise that AI systems carry risks — to individuals, to society, and to our organisation — and that responsible AI requires active governance, not passive compliance.

---

## 2. Scope

### 2.1 Systems Covered

This policy applies to all AI systems that:

- Are developed internally by ${ph("organisation name")}
- Are procured from third-party providers and deployed by ${ph("organisation name")}
- Are used in any business process affecting customers, employees, or third parties

### 2.2 Persons Covered

This policy applies to:

- All employees involved in developing, procuring, deploying, or operating AI systems
- Third-party contractors and vendors supplying AI systems or components
- ${ph("Any other categories of persons covered")}

### 2.3 Geographic Scope

This policy covers all AI systems used in the EU or affecting EU residents, and additionally applies to ${ph("other geographies where your organisation operates")}.

---

## 3. Guiding Principles

All AI systems at ${ph("organisation name")} must be designed and operated in accordance with these principles:

### 3.1 Human Agency and Oversight

AI systems augment human decision-making; they do not replace human accountability. Every AI system must have a designated human owner accountable for its behaviour. High-risk systems must have documented human oversight mechanisms.

### 3.2 Safety and Robustness

AI systems must be technically robust, operate reliably within their intended purpose, and be resistant to adversarial attacks and edge cases. Systems must be tested thoroughly before deployment and monitored continuously in production.

### 3.3 Privacy and Data Governance

Personal data used in AI systems must be processed in compliance with the GDPR and our Data Protection Policy. Data minimisation, purpose limitation, and retention limits apply. Biometric and sensitive data require explicit justification and DPO sign-off.

### 3.4 Transparency

Users interacting with AI systems must be informed that they are doing so, unless it is obvious from context. AI-generated content must be labelled as required by Article 50 of the EU AI Act. Decisions significantly affecting individuals must be explainable on request.

### 3.5 Fairness and Non-Discrimination

AI systems must be evaluated for disparate impact across protected characteristics before deployment and regularly in production. Identified disparities must be addressed before deployment of high-risk systems.

### 3.6 Accountability

Every AI system must have a named owner. Accountability for AI decisions cannot be delegated to "the algorithm". Accountability chains must be documented and maintained.

### 3.7 Environmental Responsibility

${ph("Describe your organisation's approach to the environmental impact of AI, including compute efficiency, model size justification, and energy consumption reporting")}

---

## 4. Risk Classification

${ph("Organisation name")} classifies AI systems using the EU AI Act risk framework:

| Risk Level | Classification Criteria | Internal Governance | Market Requirements |
|------------|------------------------|--------------------|--------------------|
| Unacceptable | Article 5 prohibited practices | Prohibited — not deployed | N/A |
| High | Annex III use cases | Full compliance programme required | Conformity assessment, CE marking, registration |
| Limited | Transparency obligations (Art. 50) | Transparency controls required | None beyond Art. 50 |
| Minimal | All other systems | Basic good practice | None mandatory |
| GPAI | General-purpose AI models (Art. 51–55) | GPAI compliance programme | Technical documentation, copyright policy |

All new AI systems must be classified before procurement approval or development begins.

---

## 5. Governance

### 5.1 AI Steering Committee

The **AI Steering Committee** is responsible for:

- Approving all high-risk AI use cases
- Setting AI risk appetite
- Reviewing this policy annually
- Escalation decisions on prohibited or controversial use cases

**Members:** ${ph("List members by role, e.g. CEO, CTO, CLO, DPO, CISO, Chief Risk Officer")}

**Meeting frequency:** ${ph("e.g. Quarterly")}

### 5.2 AI Compliance Function

${ph("Name of team or role")} is responsible for:

- Maintaining the AI Inventory
- Conducting compliance reviews of new AI systems
- Monitoring regulatory developments and updating this policy
- Providing training and guidance to business units

### 5.3 AI System Owners

Every deployed AI system must have a named **AI System Owner** who is responsible for:

- Ensuring compliance with this policy and applicable law
- Maintaining the system's risk management plan and technical documentation
- Reporting incidents and near-misses to the AI Compliance Function

---

## 6. Prohibited Uses

The following uses of AI are prohibited at ${ph("organisation name")} in addition to the prohibited practices under Article 5 of the EU AI Act:

- ${ph("List internal prohibited uses — e.g. Social scoring of customers or employees")}
- ${ph("List internal prohibited uses — e.g. AI-generated content designed to deceive without disclosure")}
- ${ph("List internal prohibited uses — e.g. Automated termination of employment contracts without human review")}
- AI systems used for a purpose not disclosed to affected persons
- AI systems where accountability cannot be clearly established

---

## 7. Procurement and Third-Party AI

Before procuring any AI system from a third party, the AI Compliance Function must verify:

- [ ] The supplier's EU AI Act compliance status and risk classification
- [ ] Contractual obligations regarding documentation, audit rights, and incident reporting
- [ ] The system has been assessed under our AI System Intake Process
- [ ] A System Owner has been designated internally
- [ ] ${ph("Organisation-specific procurement checks")}

**Supplier due diligence process:** ${ph("Reference to procurement policy or describe the process")}

---

## 8. AI System Lifecycle Requirements

### 8.1 Before Deployment

All AI systems must complete the following before deployment:

- [ ] Risk classification under EU AI Act
- [ ] AI Steering Committee approval (high-risk systems)
- [ ] Risk Management Plan completed and approved
- [ ] Technical Documentation completed (high-risk / provider systems)
- [ ] Human Oversight Procedure established
- [ ] Data protection impact assessment (where personal data involved)
- [ ] Staff training completed for all operators and reviewers
- [ ] System registered in the AI Inventory

### 8.2 During Operation

All AI systems in production must:

- Have an active System Owner
- Be subject to ongoing performance and fairness monitoring
- Log all human oversight interventions
- Report serious incidents within statutory deadlines

### 8.3 Decommissioning

When an AI system is decommissioned:

- Training data is deleted per the data retention schedule
- The AI Inventory entry is archived with the decommission date
- Documentation is retained for ${ph("e.g. 10 years — check applicable law")} from decommission date

---

## 9. Training and Awareness

All employees whose work involves AI must complete AI literacy training aligned with Article 4 of the EU AI Act. See the **AI Literacy Plan** for the curriculum.

${ph("Organisation name")} commits to providing:")}

- Annual AI literacy training for all relevant staff
- Role-specific deeper training for engineers, operators, reviewers, and compliance staff
- Prompt updates when significant regulatory changes occur

---

## 10. Incident and Non-Compliance Reporting

Any employee who identifies a potential breach of this policy, an AI incident, or behaviour inconsistent with our principles must report it to ${ph("reporting channel — e.g. compliance@organisation.com or incident management system")}.

Serious incidents involving high-risk AI systems must be reported to the relevant national supervisory authority within the statutory timeframe (Article 73 EU AI Act).

**Internal incident procedure:** ${ph("Link to incident response procedure")}

---

## 11. Enforcement

Breaches of this policy by employees may result in disciplinary action, up to and including termination. Breaches by suppliers may result in contract termination.

---

## 12. Policy Review

This policy will be reviewed:

- Annually by the AI Steering Committee, or
- Following significant regulatory changes, or
- Following a material incident that reveals a gap in this policy

**Next review date:** ${ph("Date — 12 months from effective date")}

---

## 13. Document Control

| Version | Date | Author | Approved by | Summary |
|---------|------|--------|-------------|---------|
| 1.0 | ${ctx.today} | ${ph("Author")} | ${ph("AI Steering Committee")} | Initial release |`;
}

// ─── 5. AI Inventory ──────────────────────────────────────────────────────────

export function aiInventory(ctx: DocContext): string {
  return `# AI Inventory

**Organisation:** ${ph("Legal name of organisation")}
**Inventory owner:** ${ph("Name, title — AI Compliance Function")}
**Last updated:** ${ctx.today}
**Version:** 1.0

> This inventory serves as the official register of all AI systems deployed by ${ph("organisation name")}. It must be maintained under version control and reviewed monthly. All new AI systems must be registered before deployment.

---

## 1. AI Systems Register

| System ID | System Name | Purpose | Risk Level | EU AI Act Category | Role | System Owner | Department | Deployment Date | Status | Last Review |
|-----------|------------|---------|-----------|-------------------|------|-------------|------------|----------------|--------|------------|
| AI-001 | ${ctx.name} | ${ctx.description || ph("Brief purpose description")} | ${ctx.risk} | ${ph("Annex III / Art. 50 / Minimal")} | ${ctx.role} | ${ph("Name")} | ${ph("Department")} | ${ph("Date")} | Active | ${ctx.today} |
| AI-002 | ${ph("System name")} | ${ph("Purpose")} | ${ph("Risk level")} | ${ph("Category")} | ${ph("Provider / Deployer")} | ${ph("Name")} | ${ph("Department")} | ${ph("Date")} | ${ph("Active / Decommissioned / Pilot")} | ${ph("Date")} |
| AI-003 | ${ph("System name")} | ${ph("Purpose")} | ${ph("Risk level")} | ${ph("Category")} | ${ph("Provider / Deployer")} | ${ph("Name")} | ${ph("Department")} | ${ph("Date")} | ${ph("Status")} | ${ph("Date")} |

*Add all AI systems. EU AI Act requires all high-risk systems to be registered in the EU database (Article 71) in addition to this internal inventory.*

---

## 2. High-Risk System Detail

> Complete this section for every system classified as **high-risk** under Annex III.

### AI-001: ${ctx.name}

| Field | Value |
|-------|-------|
| System ID | AI-001 |
| Risk classification | ${ctx.risk} |
| Annex III category | ${ph("Select: Biometrics / Critical infrastructure / Education / Employment / Essential services / Law enforcement / Migration / Justice")} |
| EU AI Act database registration | ${ph("Registration number, or 'Pending' or 'N/A'")} |
| Conformity assessment status | ${ph("Self-assessment / Notified body assessment — body name and date")} |
| CE marking | ${ph("Affixed on: date / Not yet affixed / N/A")} |
| EU Declaration of Conformity | ${ph("Date signed / Pending / N/A")} |
| Technical documentation | ${ph("Link")} |
| Risk Management Plan | ${ph("Link")} |
| Human Oversight Procedure | ${ph("Link")} |
| Post-market monitoring active | ${ph("Yes / No — if yes, link to monitoring plan")} |
| Last serious incident | ${ph("None / Date and reference")} |

---

## 3. Third-Party AI Systems in Use

| System | Supplier | Purpose | Risk | Our Role | Contract Ref | Supplier's EU AI Act status | Next Review |
|--------|---------|---------|------|----------|-------------|---------------------------|------------|
| ${ph("System name")} | ${ph("Supplier name")} | ${ph("Purpose")} | ${ph("Risk")} | Deployer | ${ph("Contract ref")} | ${ph("Compliant / Under assessment / Unknown")} | ${ph("Date")} |

---

## 4. Inventory Management Procedures

### 4.1 New System Registration

Before any AI system is deployed:

1. System Owner submits AI System Intake Form to ${ph("AI Compliance Function email or system")}
2. AI Compliance Function completes risk classification within ${ph("e.g. 5 business days")}
3. For high-risk systems: AI Steering Committee approval required before proceeding
4. System registered in this inventory with status **Pending** until deployment approved
5. System Owner notified; status updated to **Active** on go-live date

### 4.2 Material Changes

A new inventory entry version is required when:

- The system's intended purpose changes materially
- The model is significantly retrained or replaced
- The deployment environment or user population changes materially
- The system's risk classification changes

### 4.3 Decommissioning

When a system is decommissioned:

1. System Owner notifies AI Compliance Function at least ${ph("e.g. 30 days")} in advance
2. Entry updated to status **Decommissioning**; data deletion schedule confirmed
3. On decommission date: status updated to **Decommissioned**; record retained for ${ph("e.g. 10 years")}

---

## 5. Document Control

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 1.0 | ${ctx.today} | ${ph("Author")} | Initial release |`;
}

// ─── 6. AI Literacy Plan ──────────────────────────────────────────────────────

export function aiLiteracyPlan(ctx: DocContext): string {
  return `# AI Literacy Plan

**Organisation:** ${ph("Legal name of organisation")}
**System:** ${ctx.name} *(primary context; plan applies organisation-wide)*
**Industry:** ${ctx.industry}
**Regulatory basis:** Article 4, EU AI Act
**Plan owner:** ${ph("Name, title — HR / L&D / AI Compliance")}
**Effective date:** ${ctx.today}
**Review cycle:** Annual
**Version:** 1.0

---

## 1. Purpose and Legal Basis

Article 4 of the EU AI Act requires providers and deployers to take measures to ensure a sufficient level of AI literacy among staff who operate AI systems, and those responsible for procurement and governance.

This AI Literacy Plan defines how **${ph("organisation name")}** fulfils this obligation for **${ctx.name}** and across all AI systems in scope.

**Learning objectives:** By completing the programme, staff will be able to:

1. Explain the EU AI Act risk classification framework and identify the category of systems they work with
2. Recognise their specific obligations as a ${ctx.role} of a ${ctx.risk}-risk AI system
3. Identify potential AI failure modes and report them through the correct channels
4. Apply the Human Oversight Procedure for ${ctx.name}
5. ${ph("Add additional organisation-specific learning objective")}

---

## 2. Target Audiences and Role Mapping

| Audience | Individuals Covered | Modules Required | Completion Deadline |
|----------|--------------------|-----------------|--------------------|
| **All staff** with any AI exposure | ${ph("Estimated headcount")} | Module 1 | ${ph("Date — e.g. within 90 days of launch")} |
| **System operators** — use ${ctx.name} daily | ${ph("Estimated headcount")} | Modules 1 + 2 + 3 | ${ph("Date — e.g. before go-live")} |
| **Reviewers / human oversight** | ${ph("Estimated headcount")} | Modules 1 + 2 + 3 + 4 | ${ph("Date — mandatory before first override decision")} |
| **Product & engineering** | ${ph("Estimated headcount")} | Modules 1 + 2 + 5 | ${ph("Date")} |
| **Risk, legal, compliance** | ${ph("Estimated headcount")} | Modules 1 + 2 + 6 | ${ph("Date")} |
| **Executives & board members** | ${ph("Estimated headcount")} | Module 1 + Executive briefing | ${ph("Date")} |
| **Third-party contractors** | ${ph("Estimated headcount")} | Module 1 (minimum) | ${ph("Date — before access granted")} |

---

## 3. Curriculum

### Module 1: EU AI Act Fundamentals *(All staff — 60 minutes)*

**Format:** ${ph("e.g. E-learning / Instructor-led / Video series")}
**Assessment:** 10-question quiz; pass mark 80%

Topics:

- What is the EU AI Act and who does it apply to?
- Risk classification framework: minimal, limited, high, unacceptable, GPAI
- The five prohibited practices and why they matter
- Your role as a ${ctx.role}: key obligations explained plainly
- What AI can and cannot do — managing expectations
- Where to get help and how to report concerns

### Module 2: ${ctx.name} System Deep Dive *(Operators and Reviewers — 90 minutes)*

**Format:** ${ph("e.g. Instructor-led workshop with live system demo")}
**Assessment:** Practical scenario exercise; pass mark 80%

Topics:

- How ${ctx.name} works: inputs, outputs, and decision logic
- Intended use cases and explicitly prohibited uses
- Known limitations and common failure modes
- Reading confidence scores and understanding uncertainty
- When to trust the system and when to apply more scrutiny
- ${ph("Add system-specific topic — e.g. how to interpret the shortlisting score")}

### Module 3: Human Oversight and Override Procedure *(Operators and Reviewers — 45 minutes)*

**Format:** ${ph("e.g. E-learning with worked examples")}
**Assessment:** Simulated override exercise

Topics:

- Step-by-step override procedure (per Human Oversight Procedure)
- How to document an override decision correctly
- Escalation paths and when to use them
- Stop conditions — when to halt the system
- Real-world case studies of AI oversight failures and lessons learned

### Module 4: Bias Recognition and Fairness *(Reviewers — 60 minutes)*

**Format:** ${ph("e.g. Workshop with data examples")}
**Assessment:** Written reflection or quiz

Topics:

- What is algorithmic bias and how does it arise?
- Protected characteristics under the EU AI Act and GDPR
- How to recognise biased outputs in ${ctx.industry} context
- What to do when you suspect discriminatory output
- Fairness metrics used for ${ctx.name}: ${ph("list the metrics, e.g. demographic parity, equalised odds")}

### Module 5: Technical AI Literacy *(Engineering and Product — 2 hours)*

**Format:** ${ph("e.g. Internal tech talk + reading list")}

Topics:

- How machine learning models are trained and can fail
- Data quality and its impact on model performance
- Bias sources in training data and mitigation techniques
- Secure AI development: prompt injection, data poisoning, model extraction
- EU AI Act technical documentation requirements (Annex IV)

### Module 6: Regulatory Deep Dive *(Legal, Risk, Compliance — 2 hours)*

**Format:** ${ph("e.g. Workshop with legal counsel")}

Topics:

- Full EU AI Act compliance obligations for ${ctx.role}s
- Interaction with GDPR, PSD2, sectoral regulation (${ctx.industry})
- Conformity assessment pathways for high-risk systems
- Incident reporting obligations (Article 73)
- National enforcement landscape and supervisory authorities
- ${ph("Add jurisdiction-specific regulatory content")}

### Executive Briefing *(Board and C-suite — 30 minutes)*

**Format:** Briefing document + optional Q&A session

Topics:

- EU AI Act strategic implications and liability exposure
- Governance model and the AI Steering Committee's role
- Key risk areas for ${ph("organisation name")} specifically
- Questions the board should be asking

---

## 4. Delivery and Logistics

### 4.1 Delivery Methods

| Method | Modules | Provider |
|--------|---------|---------|
| E-learning (self-paced) | ${ph("Module numbers")} | ${ph("Platform, e.g. Workday Learning, Moodle")} |
| Instructor-led workshop | ${ph("Module numbers")} | ${ph("Internal L&D / External provider")} |
| On-the-job training | Module 3 | Supervised by Oversight Lead |
| Reading / self-study | Module 6 | ${ph("Materials provided by AI Compliance")} |

### 4.2 Scheduling

| Cohort | Delivery Window | Coordinator |
|--------|----------------|-------------|
| Initial rollout — all staff | ${ph("Date range")} | ${ph("Name")} |
| New starters | Within 30 days of start date | ${ph("HR / L&D")} |
| Annual refresher | ${ph("Month each year")} | ${ph("Name")} |
| Ad-hoc (post-update) | Within 30 days of material system change | ${ph("AI Compliance")} |

---

## 5. Assessment and Certification

- All modules include a knowledge check; minimum pass mark **80%**
- Module 3 (Override Procedure) includes a practical simulation exercise assessed by the Oversight Lead
- Completion is recorded in ${ph("HR/LMS system name")}
- Staff who do not complete required modules within the deadline are flagged to their line manager
- Completion certificates are available from ${ph("LMS system")}

---

## 6. Effectiveness Measurement

The plan's effectiveness will be measured by:

| Metric | Frequency | Target | Owner |
|--------|-----------|--------|-------|
| Module completion rate | Monthly | ${ph("e.g. ≥ 95%")} | ${ph("L&D")} |
| Quiz pass rate | Per cohort | ${ph("e.g. ≥ 90%")} | ${ph("L&D")} |
| Override decision quality (audited sample) | Quarterly | ${ph("e.g. ≥ 85% correct decisions in audit")} | Oversight Lead |
| Incident reports attributable to training gaps | Annually | 0 | AI Compliance |
| Post-training survey: confidence score | Per module | ${ph("e.g. ≥ 4/5 average")} | ${ph("L&D")} |

---

## 7. Plan Review and Updates

This plan will be reviewed annually and updated following:

- Material changes to ${ctx.name} or the addition of new AI systems
- Significant regulatory updates (new EU AI Act delegated acts, national guidance)
- Findings from incident reviews that reveal training gaps
- Staff feedback

**Next review date:** ${ph("Date — 12 months from effective date")}

---

## 8. Document Control

| Version | Date | Author | Approved by | Summary |
|---------|------|--------|-------------|---------|
| 1.0 | ${ctx.today} | ${ph("Author")} | ${ph("Approver")} | Initial release |`;
}

// ─── Template dispatcher ──────────────────────────────────────────────────────

export function renderTemplate(template: string, ctx: DocContext): string {
  switch (template) {
    case "Risk Management Plan": return riskManagementPlan(ctx);
    case "Technical Documentation": return technicalDocumentation(ctx);
    case "Human Oversight Procedure": return humanOversightProcedure(ctx);
    case "AI Policy": return aiPolicy(ctx);
    case "AI Inventory": return aiInventory(ctx);
    case "AI Literacy Plan": return aiLiteracyPlan(ctx);
    default: return `# ${template}\n\n${ph("Document content")}\n`;
  }
}
