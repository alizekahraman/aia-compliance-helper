import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Database,
  Eye,
  FileText,
  Flag,
  Gavel,
  LayoutList,
  Loader2,
  Lock,
  Plus,
  Radio,
  Scale,
  Shield,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { storeActions, useStore } from "@/lib/store";
import type { ApplicableArticle, RoadmapCategory, RoadmapItem } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: RoadmapCategory[] = [
  "Governance",
  "Documentation",
  "Technical Controls",
  "Human Oversight",
  "Data Governance",
  "Cybersecurity",
  "Transparency",
  "Monitoring",
];

const CATEGORY_ICON: Record<RoadmapCategory, React.ElementType> = {
  Governance: Gavel,
  Documentation: FileText,
  "Technical Controls": Shield,
  "Human Oversight": Users,
  "Data Governance": Database,
  Cybersecurity: Lock,
  Transparency: Eye,
  Monitoring: Radio,
};

const CATEGORY_COLOUR: Record<RoadmapCategory, string> = {
  Governance: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  Documentation: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Technical Controls": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  "Human Oversight": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "Data Governance": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  Cybersecurity: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  Transparency: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  Monitoring: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

const PRIORITY_STYLES: Record<RoadmapItem["priority"], string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/20 dark:text-orange-300",
  medium: "bg-primary-soft text-primary border-primary/20",
  low: "bg-muted text-muted-foreground border-border",
};

const EFFORT_LABEL: Record<RoadmapItem["effort"], string> = {
  S: "< 1 week",
  M: "1–3 weeks",
  L: "1–2 months",
  XL: "> 2 months",
};

type ViewMode = "category" | "article";
type Filter = "all" | "not-started" | "in-progress" | "complete";

const searchSchema = z.object({ id: z.string().optional() });

export const Route = createFileRoute("/roadmap")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Implementation Roadmap · AI Compliance Copilot" },
      { name: "description", content: "EU AI Act implementation assistant." },
    ],
  }),
  component: RoadmapPage,
});

// ─── Page ─────────────────────────────────────────────────────────────────────

function RoadmapPage() {
  const { assessments } = useStore();
  const { id } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [view, setView] = useState<ViewMode>("category");
  const [filter, setFilter] = useState<Filter>("all");
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(CATEGORIES));

  const selected = useMemo(
    () => assessments.find((a) => a.id === id) ?? assessments[0],
    [assessments, id],
  );

  if (!selected) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-border bg-card p-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Scale className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">No implementation plan yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Run an assessment to generate your EU AI Act implementation roadmap.
          </p>
          <Button asChild className="mt-6 gap-2">
            <Link to="/assessment">
              <Plus className="h-4 w-4" /> Start assessment
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const roadmap = selected.roadmap;
  const articles = selected.classification?.articles ?? [];
  const total = roadmap.length;
  const done = roadmap.filter((r) => r.status === "complete").length;
  const inProgress = roadmap.filter((r) => r.status === "in-progress").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const criticalOpen = roadmap.filter(
    (r) => r.priority === "critical" && r.status !== "complete",
  ).length;
  const highOpen = roadmap.filter(
    (r) => r.priority === "high" && r.status !== "complete",
  ).length;

  function toggleCategory(cat: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function updateStatus(itemId: string, status: RoadmapItem["status"]) {
    storeActions.updateRoadmapItemStatus(selected.id, itemId, status);
    if (status === "complete") toast.success("Task marked complete");
    if (status === "in-progress") toast("Marked in progress");
  }

  const filteredRoadmap = useMemo(
    () =>
      filter === "all" ? roadmap : roadmap.filter((r) => r.status === filter),
    [roadmap, filter],
  );

  const byCategory = useMemo(() => {
    const out: Partial<Record<RoadmapCategory, RoadmapItem[]>> = {};
    for (const cat of CATEGORIES) {
      const items = filteredRoadmap.filter((r) => r.category === cat);
      if (items.length > 0) out[cat] = items;
    }
    return out;
  }, [filteredRoadmap]);

  const byArticle = useMemo(() => {
    return articles.map((art) => ({
      article: art,
      items: filteredRoadmap.filter(
        (r) =>
          r.article === art.article ||
          r.why.includes(art.article) ||
          r.article?.startsWith(art.article.slice(0, 6)),
      ),
    }));
  }, [articles, filteredRoadmap]);

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">Implementation Roadmap</p>
          <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight">
            {selected.basics.systemName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {selected.classification && (
              <RiskBadge risk={selected.classification.risk} />
            )}
            <span className="text-xs text-muted-foreground">
              {selected.basics.industry} · {selected.basics.region}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {assessments.length > 1 && (
            <Select
              value={selected.id}
              onValueChange={(v) => navigate({ search: { id: v } })}
            >
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assessments.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.basics.systemName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button asChild variant="outline" className="gap-2">
            <Link to="/documents">
              <FileText className="h-4 w-4" /> Generate docs
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Overall progress
            </p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl font-semibold tracking-tight">{pct}%</span>
              <span className="pb-0.5 text-sm text-muted-foreground">
                {done}/{total}
              </span>
            </div>
            <Progress value={pct} className="mt-3 h-1.5" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Critical open
            </p>
            <div className="mt-2 flex items-end gap-2">
              <span
                className={cn(
                  "text-3xl font-semibold tracking-tight",
                  criticalOpen > 0 ? "text-destructive" : "text-success",
                )}
              >
                {criticalOpen}
              </span>
              <span className="pb-0.5 text-sm text-muted-foreground">tasks</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {criticalOpen === 0 ? "All critical items done" : "Block deployment"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              High priority open
            </p>
            <div className="mt-2 flex items-end gap-2">
              <span
                className={cn(
                  "text-3xl font-semibold tracking-tight",
                  highOpen > 0 ? "text-orange-600" : "text-success",
                )}
              >
                {highOpen}
              </span>
              <span className="pb-0.5 text-sm text-muted-foreground">tasks</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {highOpen === 0 ? "All high-priority done" : "Complete before launch"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              In progress
            </p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-3xl font-semibold tracking-tight">{inProgress}</span>
              <span className="pb-0.5 text-sm text-muted-foreground">tasks</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {total - done} remaining
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {/* View toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setView("category")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
              view === "category"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            <LayoutList className="h-3.5 w-3.5" />
            By category
          </button>
          <button
            onClick={() => setView("article")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
              view === "article"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            <BookOpen className="h-3.5 w-3.5" />
            By article
          </button>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          {(["all", "not-started", "in-progress", "complete"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors capitalize",
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted",
              )}
            >
              {f === "all"
                ? "All"
                : f === "not-started"
                ? "Not started"
                : f === "in-progress"
                ? "In progress"
                : "Complete"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Category view ────────────────────────────────────────────────────── */}
      {view === "category" && (
        <div className="space-y-4">
          {CATEGORIES.map((cat) => {
            const items = byCategory[cat];
            if (!items) return null;
            const catDone = items.filter((i) => i.status === "complete").length;
            const isOpen = openCategories.has(cat);
            const Icon = CATEGORY_ICON[cat];

            return (
              <div key={cat} className="rounded-2xl border border-border overflow-hidden">
                {/* Section header */}
                <button
                  onClick={() => toggleCategory(cat)}
                  className="flex w-full items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors"
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm",
                      CATEGORY_COLOUR[cat],
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-semibold">{cat}</p>
                    <p className="text-xs text-muted-foreground">
                      {catDone}/{items.length} tasks complete
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-1.5">
                      <Progress
                        value={Math.round((catDone / items.length) * 100)}
                        className="h-1.5 w-24"
                      />
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {Math.round((catDone / items.length) * 100)}%
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Tasks */}
                {isOpen && (
                  <div className="border-t border-border divide-y divide-border">
                    {items.map((item) => (
                      <TaskRow
                        key={item.id}
                        item={item}
                        onStatusChange={(s) => updateStatus(item.id, s)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Article view ─────────────────────────────────────────────────────── */}
      {view === "article" && (
        <div className="space-y-6">
          {articles.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No articles mapped — run a full assessment to see article-level obligations.
            </p>
          )}
          {byArticle.map(({ article, items }) => (
            <ArticleSection
              key={article.article}
              article={article}
              items={items}
              onStatusChange={(id, s) => updateStatus(id, s)}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}

// ─── Article section ──────────────────────────────────────────────────────────

function ArticleSection({
  article,
  items,
  onStatusChange,
}: {
  article: ApplicableArticle;
  items: RoadmapItem[];
  onStatusChange: (id: string, s: RoadmapItem["status"]) => void;
}) {
  const [open, setOpen] = useState(true);
  const done = items.filter((i) => i.status === "complete").length;

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      {/* Article header */}
      <div className="bg-muted/30 px-5 py-4">
        <div className="flex flex-wrap items-start gap-4">
          <div className="shrink-0 rounded-xl border border-border bg-background px-3 py-1.5 text-center">
            <p className="text-xs font-semibold text-primary">{article.article}</p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{article.title}</p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Why it applies: </span>
              {article.reason}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {done}/{items.length} done
              </span>
            )}
            <button
              onClick={() => setOpen(!open)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {open ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tasks */}
      {open && (
        <div className="divide-y divide-border">
          {items.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">
              No tasks tagged to this article — tasks may reference it in their description.
            </p>
          ) : (
            items.map((item) => (
              <TaskRow
                key={item.id}
                item={item}
                onStatusChange={(s) => onStatusChange(item.id, s)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({
  item,
  onStatusChange,
}: {
  item: RoadmapItem;
  onStatusChange: (s: RoadmapItem["status"]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const done = item.status === "complete";
  const inProgress = item.status === "in-progress";

  return (
    <div
      className={cn(
        "transition-colors",
        done && "bg-muted/20",
        inProgress && "bg-primary/5",
      )}
    >
      {/* Main row */}
      <div className="flex items-start gap-4 px-5 py-4">
        {/* Status indicator */}
        <button
          onClick={() =>
            onStatusChange(done ? "not-started" : inProgress ? "complete" : "in-progress")
          }
          className="mt-0.5 shrink-0"
          title={done ? "Reopen" : inProgress ? "Mark complete" : "Start"}
        >
          {done ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : inProgress ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
          )}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={cn(
                "font-semibold text-sm",
                done && "line-through text-muted-foreground",
              )}
            >
              {item.title}
            </h3>
            {item.article && (
              <span className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {item.article}
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {item.description}
          </p>

          {/* Meta chips */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                PRIORITY_STYLES[item.priority],
              )}
            >
              <Flag className="h-3 w-3" />
              {item.priority}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {EFFORT_LABEL[item.effort]}
            </span>
            {item.responsibleRole && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {item.responsibleRole}
              </span>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              {expanded ? (
                <>
                  <X className="h-3 w-3" /> Hide details
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" /> Details
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="shrink-0 flex flex-col gap-1.5 self-start">
          {!done && (
            <>
              {!inProgress && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2.5"
                  onClick={() => onStatusChange("in-progress")}
                >
                  Start
                </Button>
              )}
              <Button
                size="sm"
                className="h-7 text-xs px-2.5 gap-1"
                onClick={() => onStatusChange("complete")}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Done
              </Button>
            </>
          )}
          {done && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2.5 text-muted-foreground"
              onClick={() => onStatusChange("not-started")}
            >
              Reopen
            </Button>
          )}
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="mx-5 mb-4 rounded-xl border border-border bg-muted/30 divide-y divide-border overflow-hidden">
          {/* Why it applies */}
          <div className="px-4 py-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Why it applies
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">{item.why}</p>
          </div>

          {/* Required evidence */}
          {item.requiredEvidence && item.requiredEvidence.length > 0 && (
            <div className="px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Required evidence
              </p>
              <ul className="space-y-1.5">
                {item.requiredEvidence.map((ev, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span className="text-foreground/80">{ev}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested documents */}
          {item.suggestedDocuments && item.suggestedDocuments.length > 0 && (
            <div className="px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Suggested documents
              </p>
              <div className="flex flex-wrap gap-2">
                {item.suggestedDocuments.map((doc) => (
                  <Link
                    key={doc}
                    to="/documents"
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <FileText className="h-3 w-3" />
                    {doc}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
