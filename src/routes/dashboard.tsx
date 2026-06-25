import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, FileText, ListChecks, Plus, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · AI Compliance Copilot" },
      { name: "description", content: "Overview of compliance progress across your AI portfolio." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { assessments, documents } = useStore();

  const stats = useMemo(() => {
    const allItems = assessments.flatMap((a) => a.roadmap);
    const total = allItems.length;
    const done = allItems.filter((i) => i.status === "complete").length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, pct, remaining: total - done };
  }, [assessments]);

  const chartData = useMemo(() => {
    const byCat: Record<string, { name: string; complete: number; open: number }> = {};
    for (const a of assessments) {
      for (const it of a.roadmap) {
        const key = it.category;
        byCat[key] ||= { name: key.replace(" & ", " & "), complete: 0, open: 0 };
        if (it.status === "complete") byCat[key].complete++;
        else byCat[key].open++;
      }
    }
    return Object.values(byCat);
  }, [assessments]);

  if (assessments.length === 0) {
    return (
      <AppShell>
        <EmptyState />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Dashboard</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Compliance overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Status of every AI system you've classified.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/assessment"><Plus className="h-4 w-4" /> New assessment</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Compliance progress"
          value={`${stats.pct}%`}
          extra={<Progress value={stats.pct} className="mt-3 h-1.5" />}
        />
        <StatCard
          icon={<ListChecks className="h-4 w-4" />}
          label="Open tasks"
          value={`${stats.remaining}`}
          sub={`${stats.done} completed`}
        />
        <StatCard
          icon={<FileText className="h-4 w-4" />}
          label="Documents generated"
          value={`${documents.length}`}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="AI systems tracked"
          value={`${assessments.length}`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Progress by area</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} stroke="var(--muted-foreground)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="complete" stackId="a" fill="var(--success)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="open" stackId="a" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {documents.length === 0 && (
              <p className="text-sm text-muted-foreground">No documents yet. <Link to="/documents" className="text-primary underline-offset-4 hover:underline">Generate one →</Link></p>
            )}
            {documents.slice(0, 5).map((d) => (
              <Link
                key={d.id}
                to="/documents"
                className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.template}</p>
                  <p className="truncate text-xs text-muted-foreground">{d.systemName}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Latest assessments</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-4 font-medium">System</th>
                <th className="py-2 pr-4 font-medium">Risk</th>
                <th className="py-2 pr-4 font-medium">Industry</th>
                <th className="py-2 pr-4 font-medium">Progress</th>
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium" />
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => {
                const total = a.roadmap.length;
                const done = a.roadmap.filter((r) => r.status === "complete").length;
                const pct = total === 0 ? 0 : Math.round((done / total) * 100);
                return (
                  <tr key={a.id} className="border-b border-border/70 last:border-0">
                    <td className="py-3 pr-4 font-medium">{a.basics.systemName}</td>
                    <td className="py-3 pr-4">{a.classification && <RiskBadge risk={a.classification.risk} />}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{a.basics.industry}</td>
                    <td className="py-3 pr-4">
                      <div className="flex w-40 items-center gap-2">
                        <Progress value={pct} className="h-1.5" />
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 pr-4">
                      <Button asChild size="sm" variant="ghost" className="gap-1">
                        <Link to="/roadmap" search={{ id: a.id }}>Open <ArrowRight className="h-3.5 w-3.5" /></Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  extra?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-soft text-primary">{icon}</span>
          {label}
        </div>
        <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        {extra}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-border bg-card p-12 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
        <ListChecks className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-xl font-semibold">No assessments yet</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Run your first assessment to populate the compliance dashboard with risk
        classifications, roadmaps and progress tracking.
      </p>
      <Button asChild className="mt-6 gap-2">
        <Link to="/assessment"><Plus className="h-4 w-4" /> Start assessment</Link>
      </Button>
    </div>
  );
}