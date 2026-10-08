import type { CategoryKey, Criteria } from "@/types";

export const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));
export const round = (n: number) => Math.round(n);

/** Which 0-5 criteria roll up into which reported category. */
export const CATEGORY_CRITERIA: Record<CategoryKey, string[]> = {
  communication: ["clarity", "conciseness", "structure"],
  content: ["relevance", "depth", "evidence", "impact"],
  behavioral: ["situation", "task", "action", "result"],
  technical: ["correctness", "reasoning", "tradeoffs"],
  roleAlignment: ["roleAlignment"],
};

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  communication: "Communication",
  content: "Content",
  behavioral: "Behavioral (STAR)",
  technical: "Technical",
  roleAlignment: "Role alignment",
};

export const CATEGORY_WEIGHTS: Record<CategoryKey, number> = {
  communication: 0.25, content: 0.35, behavioral: 0.15, technical: 0.15, roleAlignment: 0.1,
};

export const CRITERION_LABELS: Record<string, string> = {
  clarity: "Clarity", conciseness: "Answer length", structure: "Structure", relevance: "Relevance",
  depth: "Depth", evidence: "Evidence", impact: "Impact", situation: "Situation", task: "Task",
  action: "Action", result: "Result", correctness: "Correctness", reasoning: "Reasoning",
  tradeoffs: "Trade-offs", roleAlignment: "Role alignment",
};

export const toPercent = (v: number) => clamp((v / 5) * 100);

export function categoryFromCriteria(c: Criteria, cat: CategoryKey): number | null {
  const vals = CATEGORY_CRITERIA[cat].map((k) => c[k]).filter((v): v is number => typeof v === "number");
  if (!vals.length) return null;
  return round(toPercent(vals.reduce((a, b) => a + b, 0) / vals.length));
}

/** Weighted mean that ignores categories that were not assessed (null) and renormalises. */
export function weightedScore(parts: { value: number | null; weight: number }[]): number | null {
  const valid = parts.filter((p): p is { value: number; weight: number } => p.value !== null);
  const w = valid.reduce((a, p) => a + p.weight, 0);
  if (!w) return null;
  return round(valid.reduce((a, p) => a + p.value * p.weight, 0) / w);
}

export function answerScore(c: Criteria): number {
  const cats = Object.keys(CATEGORY_CRITERIA) as CategoryKey[];
  return weightedScore(cats.map((cat) => ({ value: categoryFromCriteria(c, cat), weight: CATEGORY_WEIGHTS[cat] }))) ?? 0;
}

/** Average each criterion over the answers where it was assessed. */
export function averageCriteria(all: Criteria[]): Criteria {
  const sums: Record<string, { s: number; n: number }> = {};
  for (const c of all) for (const [k, v] of Object.entries(c)) {
    if (typeof v !== "number") continue;
    (sums[k] ??= { s: 0, n: 0 }).s += v;
    sums[k].n += 1;
  }
  return Object.fromEntries(Object.entries(sums).map(([k, { s, n }]) => [k, s / n]));
}

export function aggregateCategories(all: Criteria[]): Record<CategoryKey, number | null> {
  const avg = averageCriteria(all);
  const cats = Object.keys(CATEGORY_CRITERIA) as CategoryKey[];
  return Object.fromEntries(cats.map((c) => [c, categoryFromCriteria(avg, c)])) as Record<CategoryKey, number | null>;
}

/** Criteria sorted weakest-first. */
export function weakestCriteria(avg: Criteria, n = 3): string[] {
  return Object.entries(avg).sort((a, b) => a[1] - b[1]).slice(0, n).map(([k]) => k);
}

// ---------- Resume scoring (published methodology) ----------
export const RESUME_DIMENSIONS = [
  { key: "ats", label: "ATS compatibility", max: 20 },
  { key: "relevance", label: "Role relevance", max: 20 },
  { key: "content", label: "Content quality", max: 20 },
  { key: "impact", label: "Impact and quantification", max: 15 },
  { key: "structure", label: "Structure and readability", max: 15 },
  { key: "skills", label: "Skills alignment", max: 10 },
] as const;

export function scoreResume(ratios: Record<string, number>, notes: Record<string, string> = {}) {
  const dimensions = RESUME_DIMENSIONS.map((d) => ({
    key: d.key, label: d.label, max: d.max,
    score: Math.round(clamp(ratios[d.key] ?? 0, 0, 1) * d.max * 10) / 10,
    note: notes[d.key] ?? "",
  }));
  const overall = round(dimensions.reduce((a, d) => a + d.score, 0));
  return { dimensions, overall };
}
