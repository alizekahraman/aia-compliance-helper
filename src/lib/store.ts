import { useSyncExternalStore } from "react";
import type {
  Assessment,
  GeneratedDocument,
  RoadmapItem,
} from "@/lib/types";

const KEY = "ai-copilot-store-v1";

interface Store {
  assessments: Assessment[];
  documents: GeneratedDocument[];
  theme: "light" | "dark";
}

const initial: Store = { assessments: [], documents: [], theme: "light" };

function read(): Store {
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return initial;
    return { ...initial, ...JSON.parse(raw) } as Store;
  } catch {
    return initial;
  }
}

let state: Store = initial;
let hydrated = false;
const listeners = new Set<() => void>();

function ensureHydrated() {
  if (!hydrated && typeof window !== "undefined") {
    state = read();
    hydrated = true;
  }
}

function write(next: Store) {
  state = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    document.documentElement.classList.toggle("dark", next.theme === "dark");
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  ensureHydrated();
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot() {
  ensureHydrated();
  return state;
}

function getServerSnapshot() {
  return initial;
}

export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const storeActions = {
  upsertAssessment(a: Assessment) {
    ensureHydrated();
    const others = state.assessments.filter((x) => x.id !== a.id);
    write({ ...state, assessments: [a, ...others] });
  },
  updateRoadmapItem(assessmentId: string, item: RoadmapItem) {
    ensureHydrated();
    const assessments = state.assessments.map((a) =>
      a.id === assessmentId
        ? { ...a, roadmap: a.roadmap.map((r) => (r.id === item.id ? item : r)) }
        : a,
    );
    write({ ...state, assessments });
  },
  updateRoadmapItemStatus(
    assessmentId: string,
    itemId: string,
    status: RoadmapItem["status"],
  ) {
    ensureHydrated();
    const assessments = state.assessments.map((a) =>
      a.id === assessmentId
        ? {
            ...a,
            roadmap: a.roadmap.map((r) =>
              r.id === itemId ? { ...r, status } : r,
            ),
          }
        : a,
    );
    write({ ...state, assessments });
  },
  addDocument(d: GeneratedDocument) {
    ensureHydrated();
    write({ ...state, documents: [d, ...state.documents] });
  },
  deleteDocument(id: string) {
    ensureHydrated();
    write({ ...state, documents: state.documents.filter((d) => d.id !== id) });
  },
  setTheme(theme: "light" | "dark") {
    ensureHydrated();
    write({ ...state, theme });
  },
  toggleTheme() {
    ensureHydrated();
    write({ ...state, theme: state.theme === "dark" ? "light" : "dark" });
  },
  reset() {
    write(initial);
  },
};

export function applyThemeOnLoad() {
  if (typeof window === "undefined") return;
  const s = read();
  document.documentElement.classList.toggle("dark", s.theme === "dark");
}