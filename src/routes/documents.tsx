import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useCallback } from "react";
import {
  Copy,
  Download,
  FileText,
  Loader2,
  Plus,
  Printer,
  Trash2,
  Eye,
  Code2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { generateDocument } from "@/lib/ai/documents";
import { storeActions, useStore } from "@/lib/store";
import type { DocumentTemplate, GeneratedDocument } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Template metadata ────────────────────────────────────────────────────────

const TEMPLATES: { name: DocumentTemplate; desc: string; sections: string[] }[] = [
  {
    name: "Risk Management Plan",
    desc: "Continuous risk process per Art. 9.",
    sections: ["Risk register", "Mitigation controls", "Review cadence"],
  },
  {
    name: "AI Policy",
    desc: "Organization-wide principles, governance, prohibited uses.",
    sections: ["Guiding principles", "Governance", "Prohibited uses"],
  },
  {
    name: "Technical Documentation",
    desc: "Annex IV structure for high-risk providers.",
    sections: ["Architecture", "Training data", "Performance metrics"],
  },
  {
    name: "Human Oversight Procedure",
    desc: "Roles, oversight points and stop conditions.",
    sections: ["Roles", "Override process", "Kill-switch"],
  },
  {
    name: "AI Inventory",
    desc: "Register of AI systems and their status.",
    sections: ["Systems register", "Governance", "Review workflow"],
  },
  {
    name: "AI Literacy Plan",
    desc: "Training curriculum required by Art. 4.",
    sections: ["Curriculum", "Audiences", "Assessment"],
  },
];

// ─── Markdown renderer ────────────────────────────────────────────────────────

function countPlaceholders(content: string): number {
  return (content.match(/\[PLACEHOLDER:[^\]]+\]/g) ?? []).length;
}

interface MarkdownRendererProps {
  content: string;
}

function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // We render line by line to keep the implementation simple and safe.
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let tableBuffer: string[] = [];

  function flushTable() {
    if (tableBuffer.length < 2) {
      tableBuffer.forEach((l, idx) =>
        elements.push(<p key={`tp-${i}-${idx}`} className="text-sm">{l}</p>),
      );
      tableBuffer = [];
      return;
    }

    // Parse a Markdown table
    const rows = tableBuffer
      .filter((l) => !/^\s*[-|]+\s*$/.test(l)) // skip separator rows
      .map((l) =>
        l
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim()),
      );

    const [headerRow, ...bodyRows] = rows;

    elements.push(
      <div key={`table-${i}`} className="overflow-x-auto my-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {(headerRow ?? []).map((cell, ci) => (
                <th
                  key={ci}
                  className="border border-border bg-muted px-3 py-2 text-left font-semibold text-xs"
                >
                  {renderInline(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, ri) => (
              <tr key={ri} className="even:bg-muted/40">
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-border px-3 py-2 text-xs align-top">
                    {renderInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    tableBuffer = [];
  }

  function renderInline(text: string): React.ReactNode {
    // Split on [PLACEHOLDER: ...] markers and render them as callout spans
    const parts = text.split(/(\[PLACEHOLDER:[^\]]+\])/g);
    return parts.map((part, idx) => {
      if (part.startsWith("[PLACEHOLDER:")) {
        const desc = part.replace(/^\[PLACEHOLDER:\s*/, "").replace(/\]$/, "");
        return (
          <span
            key={idx}
            className="inline-flex items-baseline gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 font-normal not-italic border border-amber-300 dark:border-amber-700"
          >
            <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">fill</span>
            <span>{desc}</span>
          </span>
        );
      }
      // Bold **text**
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bp, bi) => {
        if (bp.startsWith("**") && bp.endsWith("**")) {
          return <strong key={`${idx}-${bi}`}>{bp.slice(2, -2)}</strong>;
        }
        return <span key={`${idx}-${bi}`}>{bp}</span>;
      });
    });
  }

  while (i < lines.length) {
    const line = lines[i];

    // Table rows
    if (/^\s*\|/.test(line)) {
      tableBuffer.push(line);
      i++;
      continue;
    } else if (tableBuffer.length > 0) {
      flushTable();
    }

    // Headings
    const h1 = line.match(/^#\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h3 = line.match(/^###\s+(.*)/);
    const h4 = line.match(/^####\s+(.*)/);

    if (h1) {
      elements.push(
        <h1 key={i} className="text-2xl font-bold tracking-tight mt-2 mb-4 text-foreground">
          {renderInline(h1[1])}
        </h1>,
      );
    } else if (h2) {
      elements.push(
        <h2 key={i} className="text-lg font-semibold mt-8 mb-2 text-foreground border-b border-border pb-1">
          {renderInline(h2[1])}
        </h2>,
      );
    } else if (h3) {
      elements.push(
        <h3 key={i} className="text-base font-semibold mt-5 mb-1.5 text-foreground">
          {renderInline(h3[1])}
        </h3>,
      );
    } else if (h4) {
      elements.push(
        <h4 key={i} className="text-sm font-semibold mt-4 mb-1 text-foreground">
          {renderInline(h4[1])}
        </h4>,
      );
    } else if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="my-6 border-border" />);
    } else if (/^\s*[-*]\s/.test(line)) {
      // Bullet list — collect consecutive bullets
      const bullets: string[] = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) {
        bullets.push(lines[i].replace(/^\s*[-*]\s/, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-2 space-y-1 pl-5">
          {bullets.map((b, bi) => (
            <li key={bi} className="text-sm list-disc text-foreground/90">
              {renderInline(b)}
            </li>
          ))}
        </ul>,
      );
      continue;
    } else if (/^\s*\d+\.\s/.test(line)) {
      // Ordered list
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="my-2 space-y-1 pl-5">
          {items.map((item, ii) => (
            <li key={ii} className="text-sm list-decimal text-foreground/90">
              {renderInline(item)}
            </li>
          ))}
        </ol>,
      );
      continue;
    } else if (/^\s*-\s+\[[ x]\]/.test(line)) {
      // Checkbox list
      const checks: { done: boolean; text: string }[] = [];
      while (i < lines.length && /^\s*-\s+\[[ x]\]/.test(lines[i])) {
        const done = /\[x\]/i.test(lines[i]);
        const text = lines[i].replace(/^\s*-\s+\[[ x]\]\s*/, "");
        checks.push({ done, text });
        i++;
      }
      elements.push(
        <ul key={`cl-${i}`} className="my-2 space-y-1 pl-2">
          {checks.map((c, ci) => (
            <li key={ci} className="flex items-start gap-2 text-sm">
              <span
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0 rounded border",
                  c.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border",
                )}
              />
              <span className={cn(c.done && "line-through text-muted-foreground")}>
                {renderInline(c.text)}
              </span>
            </li>
          ))}
        </ul>,
      );
      continue;
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={i}
          className="my-3 border-l-4 border-primary/40 pl-4 text-sm italic text-muted-foreground"
        >
          {renderInline(line.slice(2))}
        </blockquote>,
      );
    } else {
      elements.push(
        <p key={i} className="text-sm leading-relaxed text-foreground/90">
          {renderInline(line)}
        </p>,
      );
    }
    i++;
  }

  if (tableBuffer.length > 0) flushTable();

  return <div className="prose-none space-y-0.5 p-6">{elements}</div>;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Documents · AI Compliance Copilot" },
      { name: "description", content: "Generate audit-ready compliance documents." },
    ],
  }),
  component: DocumentsPage,
});

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "preview" | "edit";

function DocumentsPage() {
  const { assessments, documents } = useStore();
  const [assessmentId, setAssessmentId] = useState<string>(assessments[0]?.id ?? "");
  const [generating, setGenerating] = useState<DocumentTemplate | null>(null);
  const [selected, setSelected] = useState<GeneratedDocument | null>(null);
  const [tab, setTab] = useState<Tab>("preview");
  const [editContent, setEditContent] = useState("");

  const activeAssessment = useMemo(
    () => assessments.find((a) => a.id === assessmentId) ?? null,
    [assessmentId, assessments],
  );

  const displayContent = tab === "edit" ? editContent : (selected?.content ?? "");
  const placeholderCount = useMemo(
    () => countPlaceholders(selected?.content ?? ""),
    [selected?.content],
  );

  function selectDoc(d: GeneratedDocument) {
    setSelected(d);
    setEditContent(d.content);
    setTab("preview");
  }

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
      selectDoc(doc);
      toast.success(`${template} generated`);
    } catch {
      toast.error("Failed to generate document");
    } finally {
      setGenerating(null);
    }
  }

  const copy = useCallback(() => {
    if (!selected) return;
    void navigator.clipboard.writeText(selected.content);
    toast.success("Copied to clipboard");
  }, [selected]);

  const download = useCallback(() => {
    if (!selected) return;
    const blob = new Blob([selected.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected.template.replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selected]);

  function printDoc() {
    if (!selected) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!doctype html><html><head>
      <title>${selected.template}</title>
      <style>
        body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; font-size: 14px; line-height: 1.7; }
        h1 { font-size: 24px; border-bottom: 2px solid #333; padding-bottom: 8px; }
        h2 { font-size: 18px; margin-top: 32px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
        h3 { font-size: 15px; margin-top: 24px; }
        table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
        th { background: #f5f5f5; font-weight: bold; }
        blockquote { border-left: 4px solid #ccc; padding-left: 16px; margin: 16px 0; color: #555; }
        .ph { background: #fff8e1; border: 1px solid #f0c030; border-radius: 3px; padding: 2px 6px; font-family: monospace; font-size: 11px; color: #7a5c00; }
        @media print { body { margin: 20px; } }
      </style>
    </head><body>`);

    // Convert Markdown to basic HTML for print
    const html = selected.content
      .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/^---+$/gm, "<hr>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[PLACEHOLDER: ([^\]]+)\]/g, '<span class="ph">$1</span>')
      .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
      .replace(/^\s*[-*] (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
      .replace(/^\s*\d+\. (.+)$/gm, "<li>$1</li>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/^(?!<[hublHUBL])(.+)$/gm, "<p>$1</p>");

    win.document.write(html);
    win.document.write("</body></html>");
    win.document.close();
    win.focus();
    win.print();
  }

  function saveEdits() {
    if (!selected) return;
    const updated = { ...selected, content: editContent };
    storeActions.deleteDocument(selected.id);
    storeActions.addDocument(updated);
    setSelected(updated);
    setTab("preview");
    toast.success("Changes saved");
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Documents</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Compliance document generator</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-generated, audit-ready documents with highlighted placeholders.
          </p>
        </div>
        {assessments.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Context:</span>
            <Select value={assessmentId} onValueChange={setAssessmentId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Pick assessment" />
              </SelectTrigger>
              <SelectContent>
                {assessments.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.basics.systemName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Left panel */}
        <div className="space-y-6">
          {/* Templates */}
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
                    {generating === t.name ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t.desc}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground/70">
                      {t.sections.join(" · ")}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 shrink-0 self-center text-muted-foreground transition-opacity group-hover:text-primary" />
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Generated list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generated ({documents.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {documents.length === 0 && (
                <p className="text-sm text-muted-foreground">No documents yet. Pick a template above.</p>
              )}
              {documents.map((d) => {
                const pCount = countPlaceholders(d.content);
                return (
                  <div
                    key={d.id}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-lg border p-3 transition-colors",
                      selected?.id === d.id
                        ? "border-primary bg-primary-soft"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <button onClick={() => selectDoc(d)} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{d.template}</p>
                        {pCount > 0 && (
                          <Badge
                            variant="outline"
                            className="shrink-0 border-amber-400 bg-amber-50 text-amber-700 text-[10px] py-0 px-1.5 dark:bg-amber-900/20 dark:text-amber-300"
                          >
                            {pCount} to fill
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.systemName} · {new Date(d.createdAt).toLocaleDateString()}
                      </p>
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
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right panel: document viewer */}
        <Card className="min-h-[60vh] flex flex-col">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <CardTitle className="text-base truncate">
                {selected ? selected.template : "Preview"}
              </CardTitle>
              {selected && placeholderCount > 0 && (
                <Badge
                  variant="outline"
                  className="shrink-0 border-amber-400 bg-amber-50 text-amber-700 text-xs dark:bg-amber-900/20 dark:text-amber-300"
                >
                  {placeholderCount} placeholders
                </Badge>
              )}
            </div>

            {selected && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Preview / Edit toggle */}
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setTab("preview")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                      tab === "preview"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </button>
                  <button
                    onClick={() => setTab("edit")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                      tab === "edit"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                </div>

                <Button variant="outline" size="sm" onClick={copy} className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
                <Button variant="outline" size="sm" onClick={download} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" /> .md
                </Button>
                <Button variant="outline" size="sm" onClick={printDoc} className="gap-1.5">
                  <Printer className="h-3.5 w-3.5" /> PDF
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
            {!selected ? (
              <div className="flex h-full min-h-[50vh] flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <FileText className="h-6 w-6" />
                </span>
                <p className="mt-4 text-sm font-medium">No document selected</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-64">
                  Generate a document from the templates on the left, or click an existing one.
                </p>
              </div>
            ) : tab === "preview" ? (
              <div className="overflow-y-auto flex-1 max-h-[80vh]">
                <MarkdownRenderer content={selected.content} />
              </div>
            ) : (
              <div className="flex flex-col flex-1 min-h-0">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 min-h-[55vh] resize-none rounded-none border-0 font-mono text-xs leading-relaxed focus-visible:ring-0"
                />
                <div className="flex justify-end gap-2 border-t border-border p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditContent(selected.content);
                      setTab("preview");
                    }}
                  >
                    Discard
                  </Button>
                  <Button size="sm" onClick={saveEdits}>
                    Save changes
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
