import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ClipboardCheck, FileText, ListChecks, ShieldCheck, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Compliance Copilot — Operationalize the EU AI Act" },
      {
        name: "description",
        content:
          "Classify your AI systems, generate an actionable EU AI Act compliance roadmap, and produce audit-ready documentation in minutes.",
      },
      { property: "og:title", content: "AI Compliance Copilot" },
      {
        property: "og:description",
        content: "From risk classification to a roadmap your team can ship.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-[image:var(--gradient-hero)] px-6 py-16 sm:px-12 sm:py-24">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            EU AI Act · Operational, not just informational
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
            From AI risk to a roadmap your team can <span className="text-primary">actually ship</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Most checkers stop after assigning a risk category. AI Compliance Copilot goes
            further — generating tailored controls, documentation, and an implementation
            timeline for every AI system you operate.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/assessment">
                Start assessment <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/dashboard">View dashboard</Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Article-by-article rationale</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Audit-ready templates</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Roadmap with effort & priority</span>
          </div>
        </div>
      </section>

      <section className="mt-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-sm font-medium text-primary">How it works</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Three steps from uncertainty to action
            </h2>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<ClipboardCheck className="h-5 w-5" />}
            title="AI Risk Classification"
            description="A short interview maps your system to the EU AI Act's risk tiers — unacceptable, high, limited, minimal, or GPAI — with a confidence score and rationale."
          />
          <FeatureCard
            icon={<ListChecks className="h-5 w-5" />}
            title="Compliance Roadmap"
            description="Get a prioritized, effort-estimated checklist grouped by Risk Management, Data Governance, Human Oversight, and more. Track progress as your team executes."
          />
          <FeatureCard
            icon={<FileText className="h-5 w-5" />}
            title="Document Generator"
            description="Generate editable Markdown templates — Risk Management Plan, AI Policy, Technical Documentation, Human Oversight Procedure, AI Inventory, AI Literacy Plan."
          />
        </div>
      </section>

      <section className="mt-20 grid gap-6 rounded-3xl border border-border bg-card p-8 sm:p-12 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Built to plug into your real workflow.
          </h3>
          <p className="mt-3 text-muted-foreground">
            Every assessment is structured so a language model can refine
            classifications, draft documentation, and answer follow-up questions on
            your behalf. Wire in your provider when you're ready.
          </p>
          <div className="mt-6 flex gap-3">
            <Button asChild>
              <Link to="/assessment">Begin in under a minute</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-6 shadow-[var(--shadow-soft)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sample output</p>
          <p className="mt-3 text-lg font-semibold">Recruitment screening model</p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning-foreground dark:bg-warning/25">
            High-risk · 88% confidence
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>· Annex III high-risk use case</li>
            <li>· Art. 9 — Risk Management System required</li>
            <li>· Art. 14 — Human oversight measures</li>
            <li>· 13 roadmap actions across 7 categories</li>
          </ul>
        </div>
      </section>
    </AppShell>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="group relative overflow-hidden border-border/80 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]">
      <CardContent className="p-6">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
          {icon}
        </div>
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
