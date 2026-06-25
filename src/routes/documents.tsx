import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy, Download, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { generateDocument } from "@/lib/ai/documents";
import { storeActions, useStore } from "@/lib/store";
import type { DocumentTemplate, GeneratedDocument } from "@/lib/types";
import { cn } from "@/lib/utils";

const TEMPLATES: { name: DocumentTemplate; desc: string }[] = [
  { name: "Risk Management Plan", desc: "Continuous risk process per Art. 9." },
  { name: "AI Policy", desc: "Organization-wide principles, governance, prohibited uses." },
  { name: "Technical Documentation", desc: "Annex IV structure for high-risk providers." },
  { name: "Human Oversight Procedure", desc: "Roles, oversight points and stop conditions." },
  { name: "AI Inventory", desc: "Register of AI systems and their status." },
  { name: "AI Literacy Plan", desc: "Training curriculum required by Art. 4." },
];

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Documents · AI Compliance Copilot" },
      { name: "description", content: "Generate audit-ready compliance documents." },
    ],
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const { assessments, documents } = useStore();
  const [assessmentId, setAssessmentId] = useState<string>(assessments[0]?.id ?? "");
  const [generating, setGenerating] = useState<DocumentTemplate | null>(null);
  const [selected, setSelected] = useState<GeneratedDocument | null>(null);

  const activeAssessment = useMemo(
    () => assessments.find((a) => a.id === assessmentId) ?? null,
    [assessmentId, assessments],
  );

  async function handleGenerate(template: DocumentTemplate) {
    setGenerating(template);
    try {
      const content = await generateDocument(template, activeAssessment);
      const doc: GeneratedDocument = {
        id: `doc-${Date.now().toString(36)}`,
        template,
        assessmentId: activeAssessment?.id ?? null,
        systemName: activeAssessment?.basics.systemName ?? "Untitled",
        createdAt: new Date().toISOString(),
        content,
      };
      storeActions.addDocument(doc);
      setSelected(doc);
      toast.success(`${template} generated`);
    } catch {
      toast.error("Failed to generate document");
    } finally {
      setGenerating(null);
    }
  }

  function copy() {
    if (!selected) return;
    void navigator.clipboard.writeText(selected.content);
    toast.success("Copied to clipboard");
  }

  function download() {
    if (!selected) return;
    const blob = new Blob([selected.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected.template.replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Documents</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Compliance document generator</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate editable Markdown templates tailored to an assessment.
          </p>
        </div>
        {assessments.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Context:</span>
            <Select value={assessmentId} onValueChange={setAssessmentId}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Pick assessment" /></SelectTrigger>
              <SelectContent>
                {assessments.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.basics.systemName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Templates</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => handleGenerate(t.name)}
                  disabled={generating !== null}
                  className="group flex items-start gap-3 rounded-xl border border-border p-3 text-left transition-all hover:border-primary/50 hover:bg-muted disabled:opacity-50"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                    {generating === t.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{t.desc}</p>
                  </div>
                  <Plus className="h-4 w-4 shrink-0 self-center text-muted-foreground transition-opacity group-hover:text-primary" />
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generated ({documents.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {documents.length === 0 && (
                <p className="text-sm text-muted-foreground">No documents yet. Pick a template above.</p>
              )}
              {documents.map((d) => (
                <div
                  key={d.id}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg border p-3 transition-colors",
                    selected?.id === d.id ? "border-primary bg-primary-soft" : "border-border hover:bg-muted",
                  )}
                >
                  <button onClick={() => setSelected(d)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium">{d.template}</p>
                    <p className="truncate text-xs text-muted-foreground">{d.systemName} · {new Date(d.createdAt).toLocaleDateString()}</p>
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      storeActions.deleteDocument(d.id);
                      if (selected?.id === d.id) setSelected(null);
                      toast.success("Deleted");
                    }}
                    aria-label="Delete document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="min-h-[60vh]">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border">
            <CardTitle className="text-base">{selected ? selected.template : "Preview"}</CardTitle>
            {selected && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copy} className="gap-1.5"><Copy className="h-3.5 w-3.5" /> Copy</Button>
                <Button size="sm" onClick={download} className="gap-1.5"><Download className="h-3.5 w-3.5" /> Download</Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {!selected ? (
              <div className="flex h-full min-h-[50vh] flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <FileText className="h-6 w-6" />
                </span>
                <p className="mt-4 text-sm">Generate or select a document to view and edit it here.</p>
              </div>
            ) : (
              <Textarea
                value={selected.content}
                onChange={(e) => setSelected({ ...selected, content: e.target.value })}
                className="min-h-[60vh] resize-none rounded-none border-0 font-mono text-xs leading-relaxed focus-visible:ring-0"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}