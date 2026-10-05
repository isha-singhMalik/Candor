import type { PlanInput, PracticePlan } from "@/types";
import { CRITERION_LABELS } from "@/lib/scoring";

export const DRILLS: Record<string, string> = {
  clarity: "Answer 3 questions aloud in 3 sentences each: point, reason, example.",
  conciseness: "Re-answer your longest answer in under 90 seconds. Cut everything that is not the point or the evidence.",
  structure: "Answer 4 behavioral questions writing only S, T, A, R headings first, then speak.",
  relevance: "Before each answer, say the question's key phrase back in your first sentence.",
  depth: "Pick one technology on your resume and answer three 'why did you choose this?' questions about it.",
  evidence: "For each resume bullet, write one sentence starting 'For example, ...' with a real detail.",
  impact: "Finish five practice answers with 'As a result, ...' using only real outcomes.",
  situation: "Open each story with one sentence of context before any action.",
  task: "State 'My part was ...' explicitly in your next three answers.",
  action: "Rewrite one story replacing every 'we' with what you personally did.",
  result: "Prepare a one-sentence result and a one-sentence lesson for your three best stories.",
  reasoning: "Explain one technical topic to a friend and ask them to keep asking 'why?'.",
  tradeoffs: "End three technical answers with 'The trade-off is ...'.",
  roleAlignment: "Match three of your projects to three requirements in a real job posting.",
  correctness: "Review fundamentals for your role and re-answer questions you were unsure about.",
};

export function buildPlan({ role, weakAreas, resumeScore, speech }: PlanInput): PracticePlan {
  const [w1, w2, w3] = [weakAreas[0], weakAreas[1], weakAreas[2]];
  const label = (k?: string) => (k ? CRITERION_LABELS[k] ?? k : "your weakest area");
  const drill = (k?: string) => (k && DRILLS[k] ? DRILLS[k] : "Re-do your lowest-scoring answer and compare it with the first attempt.");
  const resumeLow = typeof resumeScore === "number" && resumeScore < 75;
  return {
    title: `7-day preparation plan for ${role || "your target role"}`,
    days: [
      { day: 1, focus: "Resume", minutes: 45, tasks: resumeLow ? [`Your resume readiness is ${resumeScore}/100. Rewrite the three weakest bullets from your analysis with real outcomes.`, "Remove generic phrases and any personal data that adds no value."] : ["Re-run the analyzer against a real job description and fix the top two gaps.", "Make sure every listed skill appears in a project or role."] },
      { day: 2, focus: "Tell me about yourself", minutes: 30, tasks: ["Write a 60-second answer: who you are, what you have built, why this role.", drill(w1 === "conciseness" || w1 === "clarity" ? w1 : "clarity"), speech && speech.fillerPer100 >= 2 ? `Record it and count filler words. Your last interview averaged ${speech.fillerPer100} per 100 words; aim to halve that.` : "Record it and listen for filler words."] },
      { day: 3, focus: "Technical fundamentals", minutes: 60, tasks: [`List 8 core topics for ${role || "your role"} and answer each aloud in under two minutes.`, drill("reasoning"), drill("tradeoffs")] },
      { day: 4, focus: "Behavioral stories", minutes: 45, tasks: ["Write three STAR stories: a challenge, a disagreement, a failure.", drill("result"), drill("action")] },
      { day: 5, focus: "Mock interview", minutes: 30, tasks: ["Take a 15-minute Candor interview using your resume as the source.", "Compare the report with your last one. Note which criteria moved."] },
      { day: 6, focus: `Weak-area practice: ${label(w1)}${w2 ? ` and ${label(w2)}` : ""}`, minutes: 45, tasks: [drill(w1), w2 ? drill(w2) : drill(w3), "Repeat the exact questions you scored lowest on."] },
      { day: 7, focus: "Final simulation", minutes: 45, tasks: ["Take a 30-minute interview with the job description as the source.", "Review the report. Write down your top three fixes for the real interview.", `Keep one weakness in mind: ${label(w1)}.`] },
    ],
  };
}
