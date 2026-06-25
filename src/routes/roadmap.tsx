import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { CheckCircle2, Circle, Clock, FileText, Flag, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { storeActions, useStore } from "@/lib/store";
import type { RoadmapItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ id: z.string().optional() });

export const Route = createFileRoute("/roadmap")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Roadmap · AI Compliance Copilot" },
      { name: "description", content: "Track your EU AI Act compliance implementation." },
    ],
  }),
  component: RoadmapPage,
});

const PRIORITY_STYLES: Record<RoadmapItem["priority"], string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-warning/20 text-warning-foreground border-warning/40",
  medium: "bg-primary-soft text-primary border-primary/20",
  low: "bg-muted text-muted-foreground border-border",
};

const EFFORT_LABEL: Record<RoadmapItem["effort"], string> = {
  S: "Small (< 1 wk)",
  M: "Medium (1–3 wks)",
  L: "Large (1–2 mo)",
  XL: "X-Large (> 2 mo)",
};

function RoadmapPage() {
  const { assessments } = useStore();
  const { id } = Route.useSearch();
  const navigate = Route.useNavigate();

  const selected = useMemo(
    () => assessments.find((a) => a.id === id) ?? assessments[0],
    [assessments, id],
  );

  if (!selected) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-border bg-card p-12 text-center">
          <h2 className="text-xl font-semibold">No roadmap yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Run an assessment to generate a roadmap.</p>
          <Button asChild className="mt-6 gap-2">
            <Link to="/assessment"><Plus className="h-4 w-4" /> Start assessment</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const total = selected.roadmap.length;
  const done = selected.roadmap.filter((r) => r.status === "complete").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const grouped = useMemo(() => {
    const out: Record<string, RoadmapItem[]> = {};
    for (const it of selected.roadmap) (out[it.category] ||= []).push(it);
    return out;
  }, [selected]);

  function update(item: RoadmapItem, status: RoadmapItem["status"]) {
    storeActions.updateRoadmapItem(selected.id, { ...item, status });
    if (status === "complete") toast.success("Marked complete");
  }

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">Implementation roadmap</p>
          <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight">{selected.basics.systemName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {selected.classification && <RiskBadge risk={selected.classification.risk} />}
            <span className="text-xs text-muted-foreground">{selected.basics.industry} · {selected.basics.region}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {assessments.length > 1 && (
            <Select
              value={selected.id}
              onValueChange={(v) => navigate({ search: { id: v } })}
            >
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {assessments.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.basics.systemName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button asChild variant="outline" className="gap-2">
            <Link to="/documents"><FileText className="h-4 w-4" /> Generate docs</Link>
          </Button>
        </div>
      </div>

      <Card className="mb-8">
        <CardContent className="grid gap-6 p-6 md:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overall completion</p>
            <div className="mt-3 flex items-end gap-3">
              <span className="text-4xl font-semibold tracking-tight">{pct}%</span>
              <span className="pb-1 text-sm text-muted-foreground">{done}/{total} tasks</span>
            </div>
            <Progress value={pct} className="mt-3 h-2" />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {(["critical", "high", "medium"] as const).map((p) => {
              const c = selected.roadmap.filter((r) => r.priority === p && r.status !== "complete").length;
              return (
                <div key={p} className="rounded-xl border border-border p-3">
                  <p className="text-xs capitalize text-muted-foreground">{p} open</p>
                  <p className="mt-1 text-2xl font-semibold">{c}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {Object.entries(grouped).map(([cat, items], gi) => (
          <section key={cat}>
            <div className="mb-3 flex items-center gap-3">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{gi + 1}</div>
              <h2 className="text-lg font-semibold">{cat}</h2>
              <span className="text-xs text-muted-foreground">
                {items.filter((i) => i.status === "complete").length}/{items.length}
              </span>
            </div>
            <div className="relative space-y-3 border-l border-border pl-6">
              {items.map((it) => (
                <TimelineItem key={it.id} item={it} onUpdate={(s) => update(it, s)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}

function TimelineItem({ item, onUpdate }: { item: RoadmapItem; onUpdate: (s: RoadmapItem["status"]) => void }) {
  const [open, setOpen] = useState(false);
  const done = item.status === "complete";
  const progress = item.status === "in-progress";

  return (
    <div className="relative">
      <span
        className={cn(
          "absolute -left-[31px] top-3 grid h-5 w-5 place-items-center rounded-full border-2 bg-background",
          done && "border-success",
          progress && "border-warning",
          !done && !progress && "border-border",
        )}
      >
        {done && <span className="h-2 w-2 rounded-full bg-success" />}
        {progress && <span className="h-2 w-2 rounded-full bg-warning" />}
      </span>
      <Card className={cn("transition-all", done && "opacity-70")}>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <button onClick={() => setOpen(!open)} className="text-left">
                <h3 className={cn("font-semibold", done && "line-through")}>{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </button>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium capitalize", PRIORITY_STYLES[item.priority])}>
                  <Flag className="h-3 w-3" /> {item.priority}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                  <Clock className="h-3 w-3" /> {EFFORT_LABEL[item.effort]}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                size="sm"
                variant={progress ? "default" : "outline"}
                onClick={() => onUpdate(progress ? "not-started" : "in-progress")}
              >
                In progress
              </Button>
              <Button
                size="sm"
                variant={done ? "default" : "outline"}
                onClick={() => onUpdate(done ? "not-started" : "complete")}
                className="gap-1"
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                {done ? "Done" : "Mark done"}
              </Button>
            </div>
          </div>
          {open && (
            <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Why it matters</p>
              <p className="mt-1 text-muted-foreground">{item.why}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}