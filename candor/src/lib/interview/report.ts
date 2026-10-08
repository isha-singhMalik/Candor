import type { CategoryKey, CategoryResult, InterviewReport, ReportInput } from "@/types";
import { aggregateCategories, averageCriteria, CATEGORY_CRITERIA, CATEGORY_LABELS, CRITERION_LABELS, round, weakestCriteria, weightedScore, CATEGORY_WEIGHTS } from "@/lib/scoring";

const explain = (key: CategoryKey, score: number | null, avg: Record<string, number>): string => {
  if (score === null) return "Not assessed in this interview (no questions exercised it).";
  const parts = CATEGORY_CRITERIA[key].filter((k) => typeof avg[k] === "number").map((k) => `${CRITERION_LABELS[k]} ${avg[k].toFixed(1)}/5`);
  return `Average of: ${parts.join(", ")}.`;
};

export function buildReport({ config, turns }: ReportInput): InterviewReport {
  const crit = turns.map((t) => t.evaluation.criteria);
  const avg = averageCriteria(crit);
  const cats = aggregateCategories(crit);
  const overall = weightedScore((Object.keys(cats) as CategoryKey[]).map((k) => ({ value: cats[k], weight: CATEGORY_WEIGHTS[k] }))) ?? 0;

  const sig = turns.map((t) => t.evaluation.signals);
  const totalWords = sig.reduce((a, s) => a + s.words, 0);
  const totalFillers = sig.reduce((a, s) => a + s.fillerCount, 0);
  const fillerTotals: Record<string, number> = {};
  sig.forEach((s) => Object.entries(s.fillers).forEach(([k, v]) => (fillerTotals[k] = (fillerTotals[k] ?? 0) + v)));
  const topFillers = Object.entries(fillerTotals).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${v})`);
  const wpms = sig.map((s) => s.wpm).filter((n): n is number => typeof n === "number");
  const speech = {
    avgWords: turns.length ? round(totalWords / turns.length) : 0,
    totalFillers,
    fillerPer100: totalWords ? Math.round((totalFillers / totalWords) * 1000) / 10 : 0,
    topFillers,
    avgSeconds: turns.length ? round(turns.reduce((a, t) => a + t.seconds, 0) / turns.length) : 0,
    wpm: wpms.length ? round(wpms.reduce((a, b) => a + b, 0) / wpms.length) : undefined,
  };

  const categories: CategoryResult[] = (Object.keys(CATEGORY_LABELS) as CategoryKey[]).map((key) => {
    const evidence: string[] = [];
    if (key === "communication") {
      evidence.push(`Average answer length: ${speech.avgWords} words.`, `Filler words: ${totalFillers} across ${totalWords} words (${speech.fillerPer100} per 100).`);
      if (speech.wpm) evidence.push(`Speaking pace: about ${speech.wpm} words per minute (voice answers only).`);
    }
    if (key === "content") {
      const withNumbers = sig.filter((s) => s.numbers.length).length;
      evidence.push(`${withNumbers} of ${turns.length} answers included a number or measurable detail.`);
    }
    if (key === "behavioral" && typeof avg.result === "number") evidence.push(`Result element averaged ${avg.result.toFixed(1)}/5, versus action ${avg.action?.toFixed(1) ?? "n/a"}/5.`);
    if (key === "technical") evidence.push(typeof avg.correctness === "number" ? `Factual correctness (assessed by the AI model) averaged ${avg.correctness.toFixed(1)}/5.` : "Rule-based mode scores reasoning and trade-offs only. Factual correctness needs an AI provider.");
    return { key, label: CATEGORY_LABELS[key], score: cats[key], explanation: explain(key, cats[key], avg), evidence };
  });

  // ---- "What you need to hear": every line is tied to a measured fact ----
  const truth: string[] = [];
  if (speech.fillerPer100 >= 2 && topFillers.length) truth.push(`You lean on filler words: ${topFillers.join(", ")}. At ${speech.fillerPer100} per 100 words, listeners will notice.`);
  if ((avg.result ?? 5) < 3 && (avg.action ?? 0) >= 3) truth.push("Your answers describe what you did but stop before saying what it achieved. The result is the part interviewers remember.");
  if ((avg.impact ?? 5) < 2.5) truth.push("Most of your answers contained no measurable outcome. Without one, the interviewer has to take your word for it.");
  if ((avg.depth ?? 5) < 3) truth.push("You name tools and ideas but rarely explain why you chose them. That reads as familiarity, not understanding.");
  if ((avg.tradeoffs ?? 5) < 2.5) truth.push("You presented one approach as if there were no alternatives. Interviewers want to see that you weighed options.");
  const long = turns.filter((t) => t.evaluation.signals.words > 260);
  if (long.length) truth.push(`${long.length} answer${long.length > 1 ? "s ran" : " ran"} past 260 words. The point arrived late, and by then the interviewer had stopped tracking.`);
  const thin = turns.filter((t) => t.evaluation.signals.words < 30);
  if (thin.length) truth.push(`${thin.length} answer${thin.length > 1 ? "s were" : " was"} under 30 words. Short answers give the interviewer nothing to work with.`);
  if ((avg.structure ?? 5) < 2.5) truth.push("Your answers lack a visible structure. The content may be good, but it is hard to follow.");
  if (!truth.length) truth.push("Nothing here is broken. The next gain comes from tighter evidence: attach a specific number or outcome to every claim.");

  const strengths = [...new Set(turns.flatMap((t) => t.evaluation.strengths))].slice(0, 4);
  const weakAreas = weakestCriteria(avg, 3);

  return {
    overall, categories, speech, brutalTruth: truth.slice(0, 5), strengths, weakAreas,
    notes: [
      "Scores come from rule-based analysis of the words you actually said or typed, computed in code from a published rubric. They are a preparation aid, not a hiring decision.",
      "Candor does not assess personality, honesty, intelligence or any trait from appearance or voice.",
    ],
    engine: "rules",
  };
}
