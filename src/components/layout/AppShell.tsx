import { Link, useRouterState } from "@tanstack/react-router";
import { Moon, ShieldCheck, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { storeActions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/assessment", label: "Assessment" },
  { to: "/roadmap", label: "Roadmap" },
  { to: "/documents", label: "Documents" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { theme } = useStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="text-base">
              AI Compliance <span className="text-primary">Copilot</span>
            </span>
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {NAV.map((n) => {
              const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary-soft text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => storeActions.toggleTheme()}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link to="/assessment">Start assessment</Link>
            </Button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-border/60 px-4 py-2 md:hidden">
          {NAV.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium",
                  active ? "bg-primary-soft text-primary" : "text-muted-foreground",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        Mock data for demonstration · Not legal advice.
      </footer>
    </div>
  );
}