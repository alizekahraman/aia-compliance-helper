<div align="center">

<!-- Hero image — replace with a real screenshot once deployed -->
<img src="https://placehold.co/1200x600/0f172a/6366f1?text=AI+Compliance+Copilot&font=inter" alt="AI Compliance Copilot hero" width="100%" style="border-radius:12px;" />

<br /><br />

# AI Compliance Copilot

**The EU AI Act implementation assistant — from classification to audit-ready documentation.**

[![Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Powered by Claude](https://img.shields.io/badge/Powered%20by-Claude%20Sonnet-cc785c?style=flat-square)](https://anthropic.com)

[**Live Demo**](#) · [**Report a Bug**](https://github.com/alizekahraman/aia-compliance-helper/issues) · [**Request a Feature**](https://github.com/alizekahraman/aia-compliance-helper/issues)

</div>

---

## Why this exists

Most EU AI Act tools stop at classification. They tell you your system is **high-risk** and leave you to figure out the rest.

**AI Compliance Copilot goes further.** It conducts a dynamic interview with your team, classifies the system under the correct risk tier, maps every applicable article, and hands you a prioritised implementation roadmap with evidence checklists — plus six audit-ready compliance documents, pre-filled with your system's details and highlighted where human input is still needed.

Think of it as a compliance consultant that works at 2 AM and never charges by the hour.

---

## Features

| | Feature | Description |
|---|---|---|
| 🎙️ | **AI-driven intake interview** | Conversational assessment that asks only what's missing. Confidence meter stops the interview at ≥ 90 %. |
| 🔍 | **Multi-agent classification** | Five specialised agents (Classification → Legal → Compliance → Reviewer) validate each other's outputs before presenting a result. |
| 📋 | **Article-level obligations** | Every applicable EU AI Act article shown with why it applies, required actions, responsible role, effort estimate, and evidence checklist. |
| 🗺️ | **Implementation roadmap** | Tasks grouped into 8 work streams. Two views: by category and by article. Mark tasks in-progress or complete. |
| 📄 | **Document generator** | Six compliance documents generated from assessment data: Risk Management Plan, Technical Documentation (Annex IV), Human Oversight Procedure, AI Policy, AI Inventory, AI Literacy Plan. |
| ✏️ | **Markdown preview + edit** | Rich rendered preview with highlighted `[PLACEHOLDER]` callouts. Switch to raw edit mode, save changes, download `.md`, or export to PDF. |
| 🔌 | **Works without an API key** | Fully functional offline with a rule-based mock. Drop in `VITE_ANTHROPIC_API_KEY` and every agent switches to Claude automatically. |
| 💾 | **Persistent state** | All assessments and documents persisted to `localStorage` — no backend required. |

---

## Screenshots

> _Replace these placeholders with real screenshots after first run._

<table>
  <tr>
    <td align="center">
      <img src="https://placehold.co/560x360/f8fafc/64748b?text=Conversational+Interview&font=inter" width="100%" alt="Conversational interview" />
      <br /><sub><b>AI-driven intake interview</b></sub>
    </td>
    <td align="center">
      <img src="https://placehold.co/560x360/f8fafc/64748b?text=Risk+Classification&font=inter" width="100%" alt="Risk classification result" />
      <br /><sub><b>Multi-agent classification result</b></sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="https://placehold.co/560x360/f8fafc/64748b?text=Implementation+Roadmap&font=inter" width="100%" alt="Implementation roadmap" />
      <br /><sub><b>Implementation roadmap — by article view</b></sub>
    </td>
    <td align="center">
      <img src="https://placehold.co/560x360/f8fafc/64748b?text=Document+Generator&font=inter" width="100%" alt="Document generator" />
      <br /><sub><b>Document generator with Markdown preview</b></sub>
    </td>
  </tr>
</table>

---

## AI Architecture

The application runs a sequential multi-agent pipeline. Each agent has a single responsibility and validates the previous agent's output before proceeding.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User Interface                               │
│          (React 19 · TanStack Router · Tailwind CSS v4)             │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Conversation Agent                               │
│  Dynamic intake interview · 7-dimension coverage model              │
│  Stops when confidence ≥ 90 %                                       │
└────────────────────────┬────────────────────────────────────────────┘
                         │  BasicInfo + ConversationTurn[]
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Orchestration Pipeline                            │
│                                                                     │
│   ┌──────────────────┐     ┌──────────────────┐                    │
│   │ Classification   │────▶│   Legal Agent    │                    │
│   │ Agent            │     │                  │                    │
│   │ Risk tier · conf │     │ Articles · obli- │                    │
│   │idence · rationale│     │ gations · docs   │                    │
│   └──────────────────┘     └────────┬─────────┘                    │
│                                     │                               │
│                            ┌────────▼─────────┐                    │
│                            │ Compliance Agent │                    │
│                            │                  │                    │
│                            │ 18-task roadmap  │                    │
│                            │ per risk level   │                    │
│                            └────────┬─────────┘                    │
│                                     │                               │
│                            ┌────────▼─────────┐                    │
│                            │ Reviewer Agent   │                    │
│                            │                  │                    │
│                            │ Cross-checks all │                    │
│                            │ agent outputs ·  │                    │
│                            │ applies fixes    │                    │
│                            └────────┬─────────┘                    │
└─────────────────────────────────────┼───────────────────────────────┘
                                      │  OrchestrationResult
                         ┌────────────▼────────────┐
                         │   Documentation Agent   │
                         │                         │
                         │  Generates 6 EU AI Act  │
                         │  compliance documents   │
                         └─────────────────────────┘

                    ┌────────────────────────────────┐
                    │        Provider Layer           │
                    │                                │
                    │  AnthropicProvider             │
                    │  (VITE_ANTHROPIC_API_KEY set)  │
                    │           or                   │
                    │  MockProvider                  │
                    │  (rule-based · no key needed)  │
                    └────────────────────────────────┘
```

All agent responses are validated with **Zod schemas** before being used downstream. If the Reviewer Agent fails, the pipeline continues gracefully with the unreviewed outputs rather than blocking the user.

---

## Folder Structure

```
src/
├── lib/
│   ├── ai/
│   │   ├── agents/
│   │   │   ├── base.ts              # Abstract BaseAgent<TInput, TOutput>
│   │   │   ├── classification.ts    # Risk level · confidence · rationale
│   │   │   ├── compliance.ts        # 18-task implementation roadmap
│   │   │   ├── conversation.ts      # Dynamic intake interview
│   │   │   ├── documentation.ts     # 6 compliance document templates
│   │   │   ├── evaluator.ts         # Pre-classification sufficiency check
│   │   │   ├── legal.ts             # Article mapping · obligations
│   │   │   └── reviewer.ts          # Cross-agent consistency checker
│   │   ├── document-templates.ts    # Rich Markdown templates (6 docs)
│   │   ├── orchestrator.ts          # Sequential pipeline + progress events
│   │   ├── prompts.ts               # All prompt builders (pure functions)
│   │   ├── provider.ts              # AnthropicProvider / MockProvider
│   │   └── schema.ts                # Zod schemas for every agent response
│   ├── store.ts                     # localStorage persistence (useSyncExternalStore)
│   ├── types.ts                     # Shared TypeScript interfaces
│   └── utils.ts
├── routes/
│   ├── index.tsx                    # Landing / home
│   ├── assessment.tsx               # Conversational interview + classification
│   ├── roadmap.tsx                  # Implementation roadmap (dual view)
│   ├── documents.tsx                # Document generator + preview
│   └── dashboard.tsx                # Assessment history
└── components/
    ├── layout/AppShell.tsx
    ├── RiskBadge.tsx
    └── ui/                          # shadcn/ui component library
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [React 19](https://react.dev/) |
| Routing | [TanStack Router](https://tanstack.com/router) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Components | [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://radix-ui.com/) |
| Validation | [Zod](https://zod.dev/) |
| AI | [Anthropic Claude](https://anthropic.com) (claude-sonnet-4-6) |
| Build | [Vite 8](https://vitejs.dev/) |
| Runtime | [Bun](https://bun.sh/) |
| Language | [TypeScript 5.9](https://www.typescriptlang.org/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Toasts | [Sonner](https://sonner.emilkowal.ski/) |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) ≥ 1.0 — `curl -fsSL https://bun.sh/install | bash`
- Node.js ≥ 18 (Bun includes its own runtime, but some tools need Node)
- An Anthropic API key _(optional — the app runs fully without one)_

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/alizekahraman/aia-compliance-helper.git
cd aia-compliance-helper

# 2. Install dependencies
bun install
```

### Running locally

```bash
bun run dev
```

Open **[http://localhost:8080](http://localhost:8080)** in your browser.

The app runs immediately with the built-in smart mock — no API key needed. Every agent produces realistic, rule-based outputs so you can explore the full workflow offline.

### Other commands

```bash
bun run build       # Production build (client + SSR)
bun run preview     # Preview the production build locally
bun run lint        # ESLint
bun run format      # Prettier
```

---

## Anthropic Integration

The app ships with a **provider abstraction** that makes switching between real and mock AI trivial.

### Enabling Claude

Create a `.env.local` file in the project root:

```bash
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

Restart the dev server. Every agent automatically switches from the rule-based mock to **Claude Sonnet 4.6** — no other changes needed.

### How it works

```
src/lib/ai/provider.ts

  getProvider()
  ├── VITE_ANTHROPIC_API_KEY set?
  │     └── YES → AnthropicProvider (calls api.anthropic.com/v1/messages)
  └── NO  → MockProvider (rule-based, works offline)
```

Both providers implement the same `Provider` interface, so every agent is unaware of which backend it's talking to:

```typescript
export interface Provider {
  complete(messages: Message[], systemPrompt?: string): Promise<string>;
}
```

### Adding a different model or provider

1. Implement `Provider` in a new file under `src/lib/ai/`
2. Return it from `getProvider()` based on whichever env var or condition you choose
3. Nothing else in the codebase changes

---

## EU AI Act Coverage

The following obligations are addressed in the current implementation:

| Article | Topic | Status |
|---|---|---|
| Art. 4 | AI literacy | ✅ AI Literacy Plan template + roadmap task |
| Art. 5 | Prohibited practices | ✅ Classification · AI Policy template |
| Art. 9 | Risk management | ✅ Risk Management Plan · roadmap tasks |
| Art. 10 | Data governance | ✅ Technical Documentation · roadmap tasks |
| Art. 11 | Technical documentation | ✅ Annex IV template |
| Art. 12 | Record-keeping / logging | ✅ Roadmap task with evidence checklist |
| Art. 13 | Instructions for use | ✅ Roadmap task |
| Art. 14 | Human oversight | ✅ Human Oversight Procedure template |
| Art. 15 | Accuracy & cybersecurity | ✅ Roadmap tasks |
| Art. 47 | Declaration of Conformity | ✅ Roadmap task |
| Art. 50 | Transparency obligations | ✅ Roadmap tasks |
| Art. 51–55 | GPAI obligations | ✅ Classification + legal mapping |
| Art. 71 | EU AI database registration | ✅ AI Inventory template |
| Art. 72 | Post-market monitoring | ✅ Roadmap task + Risk Management Plan |
| Art. 73 | Serious incident reporting | ✅ Roadmap task with evidence checklist |

---

## Roadmap

- [ ] **Export to DOCX** — one-click Word document export from any generated document
- [ ] **Multi-system dashboard** — compare risk levels and completion across a portfolio of AI systems
- [ ] **Team collaboration** — share assessments and assign roadmap tasks to teammates
- [ ] **Notified body checklist** — Annex VII conformity assessment self-check
- [ ] **Regulation tracker** — alerts when new EU AI Act delegated acts or guidance updates land
- [ ] **Deployer mode** — separate obligation view for deployers vs. providers
- [ ] **Integration with EU AI database** — direct registration submission flow

---

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create a feature branch — `git checkout -b feat/your-feature`
3. Make your changes
4. Run `bun run build` to confirm a clean build
5. Open a pull request

---

## License

MIT © [Alize Kahraman](https://github.com/alizekahraman)

---

<div align="center">

Built with the [Claude API](https://anthropic.com) · Designed for compliance teams navigating the EU AI Act

</div>
