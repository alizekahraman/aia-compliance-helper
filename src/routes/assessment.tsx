import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Stepper } from "@/components/assessment/Stepper";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { classifyAssessment, generateRoadmap } from "@/lib/ai/classifier";
import { INTERVIEW_QUESTIONS } from "@/lib/ai/questions";
import { storeActions } from "@/lib/store";
import type { Assessment, BasicInfo, ClassificationResult, QAEntry, RoadmapItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assessment")({
  head: () => ({
    meta: [
      { title: "Assessment · AI Compliance Copilot" },
      { name: "description", content: "Classify your AI system under the EU AI Act in a few guided steps." },
    ],
  }),
  component: AssessmentPage,
});

const STEPS = [
  { id: 1, label: "System basics" },
  { id: 2, label: "Interview" },
  { id: 3, label: "Classification" },
  { id: 4, label: "Roadmap" },
];

const INDUSTRIES = ["Financial services", "Healthcare", "Public sector", "Education", "HR & Recruitment", "Retail / E-commerce", "Manufacturing", "Insurance", "Other"];
const REGIONS = ["European Union", "EEA / EFTA", "United Kingdom", "United States", "Global"];

function AssessmentPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [basics, setBasics] = useState<BasicInfo>({
    systemName: "",
    description: "",
    industry: "",
    role: "provider",
    audience: "internal",
    region: "European Union",
  });
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<QAEntry[]>([]);
  const [classifying, setClassifying] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  const basicsValid =
    basics.systemName.trim() && basics.description.trim() && basics.industry && basics.region;

  async function runClassification(finalAnswers: QAEntry[]) {
    setClassifying(true);
    try {
      const classification = await classifyAssessment(basics, finalAnswers);
      const rm = await generateRoadmap(basics, classification);
      const id = `as-${Date.now().toString(36)}`;
      const assessment: Assessment = {
        id,
        createdAt: new Date().toISOString(),
        basics,
        answers: finalAnswers,
        classification,
        roadmap: rm,
      };
      storeActions.upsertAssessment(assessment);
      setAssessmentId(id);
      setResult(classification);
      setRoadmap(rm);
      setStep(3);
      toast.success("Classification complete", {
        description: `${assessment.basics.systemName} mapped to ${classification.risk} risk.`,
      });
    } catch (e) {
      toast.error("Could not complete classification.");
      console.error(e);
    } finally {
      setClassifying(false);
    }
  }

  function answerQuestion(value: string) {
    const q = INTERVIEW_QUESTIONS[qIndex];
    const next: QAEntry[] = [
      ...answers.filter((a) => a.questionId !== q.id),
      { questionId: q.id, question: q.text, answer: value },
    ];
    setAnswers(next);
    if (qIndex < INTERVIEW_QUESTIONS.length - 1) {
      setQIndex(qIndex + 1);
    } else {
      void runClassification(next);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="text-sm font-medium text-primary">Assessment</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Classify an AI system</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Answer a few questions to map your system to the EU AI Act and generate an
            implementation roadmap.
          </p>
        </header>

        <Stepper steps={STEPS} current={step} />

        <div className="mt-8">
          {step === 1 && (
            <BasicsStep
              basics={basics}
              setBasics={setBasics}
              onNext={() => {
                if (!basicsValid) {
                  toast.error("Fill in the required fields to continue.");
                  return;
                }
                setStep(2);
              }}
            />
          )}

          {step === 2 && (
            <InterviewStep
              qIndex={qIndex}
              answers={answers}
              loading={classifying}
              onAnswer={answerQuestion}
              onBack={() => (qIndex === 0 ? setStep(1) : setQIndex(qIndex - 1))}
            />
          )}

          {step === 3 && result && (
            <ResultsStep
              result={result}
              systemName={basics.systemName}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && (
            <RoadmapPreview
              roadmap={roadmap}
              onFinish={() => {
                toast.success("Saved to dashboard.");
                navigate({ to: "/dashboard" });
              }}
              onOpenRoadmap={() =>
                assessmentId
                  ? navigate({ to: "/roadmap", search: { id: assessmentId } })
                  : navigate({ to: "/roadmap" })
              }
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function BasicsStep({
  basics,
  setBasics,
  onNext,
}: {
  basics: BasicInfo;
  setBasics: (b: BasicInfo) => void;
  onNext: () => void;
}) {
  function update<K extends keyof BasicInfo>(k: K, v: BasicInfo[K]) {
    setBasics({ ...basics, [k]: v });
  }
  return (
    <Card className="animate-in fade-in-50 slide-in-from-bottom-2">
      <CardHeader>
        <CardTitle>Tell us about the system</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="name">AI system name *</Label>
          <Input
            id="name"
            value={basics.systemName}
            onChange={(e) => update("systemName", e.target.value)}
            placeholder="e.g. Talent Match Recommender"
            className="mt-1.5"
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="desc">Short description *</Label>
          <Textarea
            id="desc"
            value={basics.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="What does the system do, and for whom?"
            className="mt-1.5"
            rows={3}
          />
        </div>
        <div>
          <Label>Industry *</Label>
          <Select value={basics.industry} onValueChange={(v) => update("industry", v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select industry" /></SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Geographic region *</Label>
          <Select value={basics.region} onValueChange={(v) => update("region", v)}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Your role</Label>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {(["provider", "deployer"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => update("role", r)}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-medium capitalize transition-colors",
                  basics.role === r
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border hover:bg-muted",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Audience</Label>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {(["internal", "customer-facing"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => update("audience", r)}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-medium capitalize transition-colors",
                  basics.audience === r
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border hover:bg-muted",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button onClick={onNext} className="gap-2">
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InterviewStep({
  qIndex,
  answers,
  loading,
  onAnswer,
  onBack,
}: {
  qIndex: number;
  answers: QAEntry[];
  loading: boolean;
  onAnswer: (v: string) => void;
  onBack: () => void;
}) {
  const q = INTERVIEW_QUESTIONS[qIndex];
  const progress = (qIndex / INTERVIEW_QUESTIONS.length) * 100;
  const current = answers.find((a) => a.questionId === q.id)?.answer;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="font-medium">Analyzing your system…</p>
          <p className="text-sm text-muted-foreground">Matching answers against EU AI Act articles.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-in fade-in-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Question {qIndex + 1} of {INTERVIEW_QUESTIONS.length}
          </p>
          <p className="text-xs text-muted-foreground">{Math.round(progress)}% complete</p>
        </div>
        <Progress value={progress} className="mt-2 h-1.5" />
        <CardTitle className="mt-4 text-xl">{q.text}</CardTitle>
        {q.hint && <p className="text-sm text-muted-foreground">{q.hint}</p>}
      </CardHeader>
      <CardContent className="space-y-2">
        {q.options.map((o) => (
          <button
            key={o.value}
            onClick={() => onAnswer(o.value)}
            className={cn(
              "group flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all",
              current === o.value
                ? "border-primary bg-primary-soft text-primary"
                : "border-border hover:border-primary/50 hover:bg-muted",
            )}
          >
            <span>{o.label}</span>
            <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ))}
        <div className="flex justify-between pt-4">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultsStep({
  result,
  systemName,
  onNext,
  onBack,
}: {
  result: ClassificationResult;
  systemName: string;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2">
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Classification result
              </p>
              <h2 className="mt-2 text-2xl font-semibold">{systemName}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <RiskBadge risk={result.risk} />
                <span className="text-sm text-muted-foreground">
                  Confidence <span className="font-semibold text-foreground">{Math.round(result.confidence * 100)}%</span>
                </span>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs text-primary">
              <Sparkles className="h-3.5 w-3.5" /> AI-assisted analysis
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{result.rationale}</p>
          <div className="mt-4">
            <Progress value={result.confidence * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Applicable EU AI Act articles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {result.articles.map((a) => (
            <div key={a.article + a.title} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">{a.article}</span>
                <h3 className="font-semibold">{a.title}</h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{a.reason}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {result.missingInfo.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Improve confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {result.missingInfo.map((m, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                  <span className="text-muted-foreground">{m}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Revisit answers
        </Button>
        <Button onClick={onNext} className="gap-2">
          Generate roadmap <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function RoadmapPreview({
  roadmap,
  onFinish,
  onOpenRoadmap,
}: {
  roadmap: RoadmapItem[];
  onFinish: () => void;
  onOpenRoadmap: () => void;
}) {
  const grouped = useMemo(() => groupByCategory(roadmap), [roadmap]);
  return (
    <div className="space-y-6 animate-in fade-in-50">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">Roadmap generated</p>
              <p className="text-sm text-muted-foreground">
                {roadmap.length} actions across {Object.keys(grouped).length} compliance areas.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onFinish}>Go to dashboard</Button>
            <Button onClick={onOpenRoadmap}>Open roadmap</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(grouped).map(([cat, items]) => (
          <Card key={cat}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{cat}</CardTitle>
              <p className="text-xs text-muted-foreground">{items.length} action{items.length !== 1 ? "s" : ""}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.slice(0, 3).map((it) => (
                <div key={it.id} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">{it.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{it.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function groupByCategory(items: RoadmapItem[]) {
  return items.reduce<Record<string, RoadmapItem[]>>((acc, it) => {
    (acc[it.category] ||= []).push(it);
    return acc;
  }, {});
}