import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";
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
import { classifyAssessment, type ProgressEvent } from "@/lib/ai/classifier";
import { conversationAgent, type ConversationTurn } from "@/lib/ai/agents/conversation";
import { getProvider } from "@/lib/ai/provider";
import { storeActions } from "@/lib/store";
import type { Assessment, BasicInfo, ClassificationResult, QAEntry, RoadmapItem } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/assessment")({
  head: () => ({
    meta: [
      { title: "Assessment · AI Compliance Copilot" },
      { name: "description", content: "Classify your AI system under the EU AI Act in a guided AI conversation." },
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

const INDUSTRIES = [
  "Financial services", "Healthcare", "Public sector", "Education",
  "HR & Recruitment", "Retail / E-commerce", "Manufacturing", "Insurance", "Other",
];
const REGIONS = ["European Union", "EEA / EFTA", "United Kingdom", "United States", "Global"];
const CONFIDENCE_GOAL = 0.90;

const AGENT_STAGES: Array<{ stage: ProgressEvent["stage"]; label: string }> = [
  { stage: "classification", label: "Classification Agent" },
  { stage: "legal", label: "Legal Agent" },
  { stage: "compliance", label: "Compliance Agent" },
  { stage: "reviewer", label: "Reviewer Agent" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

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

  // ── Conversation state ──
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [suggestedOptions, setSuggestedOptions] = useState<string[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [aiThinking, setAiThinking] = useState(false);

  // ── Classification state ──
  const [classifying, setClassifying] = useState(false);
  const [agentProgress, setAgentProgress] = useState<ProgressEvent | null>(null);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  const basicsValid =
    basics.systemName.trim() && basics.description.trim() && basics.industry && basics.region;

  // ── Start conversation when step 2 mounts ──
  async function startInterview() {
    setHistory([]);
    setCurrentQuestion("");
    setConfidence(0);
    setAiThinking(true);
    try {
      const { provider, isMock } = getProvider();
      const res = await conversationAgent.run({ basics, history: [] }, provider, isMock);
      setCurrentQuestion(res.nextQuestion ?? "");
      setSuggestedOptions(res.suggestedOptions);
      setConfidence(res.confidence);
    } catch (e) {
      console.error("Conversation start error:", e);
      toast.error("Could not start the interview. Please try again.");
    } finally {
      setAiThinking(false);
    }
  }

  // ── Submit an answer and get the next question ──
  async function submitAnswer(answer: string) {
    if (!answer.trim() || !currentQuestion) return;

    const newTurn: ConversationTurn = { question: currentQuestion, answer: answer.trim() };
    const newHistory = [...history, newTurn];
    setHistory(newHistory);
    setCurrentQuestion("");
    setSuggestedOptions([]);
    setAiThinking(true);

    try {
      const { provider, isMock } = getProvider();
      const res = await conversationAgent.run({ basics, history: newHistory }, provider, isMock);
      setConfidence(res.confidence);

      if (res.sufficient || res.confidence >= CONFIDENCE_GOAL || res.nextQuestion === null) {
        void runClassification(newHistory);
        return;
      }

      setCurrentQuestion(res.nextQuestion);
      setSuggestedOptions(res.suggestedOptions);
    } catch (e) {
      console.error("Conversation error:", e);
      toast.error("Something went wrong. Please try again.");
      setCurrentQuestion(currentQuestion); // restore
    } finally {
      setAiThinking(false);
    }
  }

  // ── Run multi-agent classification pipeline ──
  async function runClassification(conversationHistory: ConversationTurn[]) {
    setClassifying(true);
    setAgentProgress(null);

    const finalAnswers: QAEntry[] = conversationHistory.map((t, i) => ({
      questionId: `conv-${i}`,
      question: t.question,
      answer: t.answer,
    }));

    try {
      const { classification, roadmap: rm } = await classifyAssessment(
        basics,
        finalAnswers,
        (event) => setAgentProgress(event),
      );
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
        description: `${basics.systemName} mapped to ${classification.risk} risk.`,
      });
    } catch (e) {
      toast.error("Could not complete classification.");
      console.error(e);
    } finally {
      setClassifying(false);
      setAgentProgress(null);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="text-sm font-medium text-primary">Assessment</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Classify an AI system</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            An AI compliance consultant will ask targeted questions to map your system to the
            EU AI Act and generate an implementation roadmap.
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
                void startInterview();
              }}
            />
          )}

          {step === 2 && (
            <ConversationStep
              systemName={basics.systemName}
              history={history}
              currentQuestion={currentQuestion}
              suggestedOptions={suggestedOptions}
              confidence={confidence}
              aiThinking={aiThinking}
              classifying={classifying}
              agentProgress={agentProgress}
              onSubmit={submitAnswer}
              onBack={() => setStep(1)}
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

// ─── Step 1: System basics ────────────────────────────────────────────────────

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
            placeholder="What does the system do, and for whom? The more detail you give, the fewer follow-up questions the AI will need to ask."
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
            Start interview <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Step 2: Conversational interview ────────────────────────────────────────

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const toward90 = Math.min((value / CONFIDENCE_GOAL) * 100, 100);

  const statusLabel =
    pct < 30 ? "Building context…" :
    pct < 55 ? "Making progress…" :
    pct < 75 ? "Good coverage…" :
    pct < 88 ? "Almost there…" :
    "Sufficient — classifying now";

  const statusColor =
    pct < 55 ? "text-muted-foreground" :
    pct < 80 ? "text-warning" :
    "text-success";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className={cn("font-medium", statusColor)}>{statusLabel}</span>
        <span className="tabular-nums font-semibold text-foreground">{pct}%</span>
      </div>
      <Progress value={toward90} className="h-1.5" />
      <p className="text-xs text-muted-foreground">
        Confidence toward the 90% classification threshold
      </p>
    </div>
  );
}

function ConversationStep({
  systemName,
  history,
  currentQuestion,
  suggestedOptions,
  confidence,
  aiThinking,
  classifying,
  agentProgress,
  onSubmit,
  onBack,
}: {
  systemName: string;
  history: ConversationTurn[];
  currentQuestion: string;
  suggestedOptions: string[];
  confidence: number;
  aiThinking: boolean;
  classifying: boolean;
  agentProgress: ProgressEvent | null;
  onSubmit: (answer: string) => void;
  onBack: () => void;
}) {
  const [input, setInput] = useState("");
  const historyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll history to bottom when new turn is added
  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: "smooth" });
  }, [history]);

  // Focus input when a new question arrives
  useEffect(() => {
    if (currentQuestion && !aiThinking) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [currentQuestion, aiThinking]);

  function handleSubmit() {
    const answer = input.trim();
    if (!answer) return;
    setInput("");
    onSubmit(answer);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  // ── Classification loading screen ──
  if (classifying) {
    const activeIndex = AGENT_STAGES.findIndex((s) => s.stage === agentProgress?.stage);
    return (
      <Card className="animate-in fade-in-50">
        <CardContent className="flex flex-col items-center gap-6 py-14 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div>
            <p className="font-semibold">{agentProgress?.label ?? "Analyzing your system…"}</p>
            <p className="mt-1 text-sm text-muted-foreground">Running multi-agent EU AI Act analysis.</p>
          </div>
          {agentProgress && activeIndex >= 0 && (
            <div className="w-full max-w-xs space-y-2">
              {AGENT_STAGES.map((s, i) => {
                const isDone = i < activeIndex || (i === activeIndex && agentProgress.status === "done");
                const isActive = i === activeIndex && agentProgress.status === "running";
                return (
                  <div
                    key={s.stage}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                      isDone && "border-success/30 bg-success/10 text-success",
                      isActive && "border-primary/40 bg-primary-soft text-primary",
                      !isDone && !isActive && "border-border text-muted-foreground",
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    ) : isActive ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                    ) : (
                      <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-current" />
                    )}
                    {s.label}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-2">
      {/* Confidence meter */}
      {(confidence > 0 || history.length > 0) && (
        <Card>
          <CardContent className="py-4">
            <ConfidenceMeter value={confidence} />
          </CardContent>
        </Card>
      )}

      {/* Main conversation card */}
      <Card className="overflow-hidden">
        {/* Header */}
        <CardHeader className="border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary-soft text-primary">
              <MessageCircle className="h-3.5 w-3.5" />
            </span>
            <div>
              <CardTitle className="text-base">AI Compliance Interview</CardTitle>
              <p className="text-xs text-muted-foreground">{systemName}</p>
            </div>
            <div className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> Live AI
            </div>
          </div>
        </CardHeader>

        {/* Conversation history */}
        {history.length > 0 && (
          <div
            ref={historyRef}
            className="max-h-64 overflow-y-auto border-b border-border bg-muted/30 px-4 py-3 space-y-3"
          >
            {history.map((turn, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex gap-2">
                  <span className="mt-0.5 h-5 w-5 shrink-0 grid place-items-center rounded-full bg-primary-soft text-primary text-[10px] font-bold">AI</span>
                  <p className="text-sm text-muted-foreground leading-relaxed">{turn.question}</p>
                </div>
                <div className="flex gap-2 pl-1">
                  <span className="mt-0.5 h-5 w-5 shrink-0 grid place-items-center rounded-full bg-muted border border-border text-[10px] font-bold text-foreground">
                    You
                  </span>
                  <p className="text-sm font-medium leading-relaxed">{turn.answer}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Current question */}
        <CardContent className="py-5 space-y-4">
          {aiThinking ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>AI is thinking…</span>
            </div>
          ) : currentQuestion ? (
            <>
              <div className="flex gap-2.5">
                <span className="mt-0.5 h-6 w-6 shrink-0 grid place-items-center rounded-full bg-primary-soft text-primary text-[10px] font-bold">
                  AI
                </span>
                <p className="text-base font-medium leading-relaxed">{currentQuestion}</p>
              </div>

              {/* Quick-reply chips */}
              {suggestedOptions.length > 0 && (
                <div className="flex flex-wrap gap-2 pl-8">
                  {suggestedOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setInput("");
                        onSubmit(opt);
                      }}
                      className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Free-text input */}
              <div className="flex gap-2 pl-8">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your answer… (Enter to send)"
                  rows={2}
                  className="resize-none text-sm"
                />
                <Button
                  size="icon"
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  className="h-auto shrink-0 self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to basics
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Step 3: Results ──────────────────────────────────────────────────────────

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
                  Confidence{" "}
                  <span className="font-semibold text-foreground">
                    {Math.round(result.confidence * 100)}%
                  </span>
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
                <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                  {a.article}
                </span>
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

// ─── Step 4: Roadmap preview ──────────────────────────────────────────────────

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
              <p className="text-xs text-muted-foreground">
                {items.length} action{items.length !== 1 ? "s" : ""}
              </p>
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
