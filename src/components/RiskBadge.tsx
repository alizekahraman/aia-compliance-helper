import type { RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABELS: Record<RiskLevel, string> = {
  minimal: "Minimal risk",
  limited: "Limited risk",
  high: "High risk",
  unacceptable: "Unacceptable",
  gpai: "GPAI model",
};

const STYLES: Record<RiskLevel, string> = {
  minimal: "bg-success/15 text-success border-success/30",
  limited: "bg-primary-soft text-primary border-primary/20",
  high: "bg-warning/20 text-warning-foreground border-warning/40 dark:bg-warning/25",
  unacceptable: "bg-destructive/15 text-destructive border-destructive/30",
  gpai: "bg-accent text-accent-foreground border-accent",
};

export function RiskBadge({ risk, className }: { risk: RiskLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        STYLES[risk],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {LABELS[risk]}
    </span>
  );
}