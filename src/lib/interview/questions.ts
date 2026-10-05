import type { GeneratedQuestion, QuestionInput } from "@/types";
import { candidates, QUESTION_BANK } from "./bank";
import { extractSkills, skillCounts } from "@/lib/resume/skills";

const VERBS = /^(built|developed|created|designed|implemented|engineered|led|launched|automated|analy[sz]ed|deployed|trained|integrated)\b/i;
const bulletStrip = (l: string) => l.replace(/^[\s\-•*▪●◦–>]+/, "").trim();

export function resumeClaims(resumeText: string): string[] {
  return resumeText.split("\n").map(bulletStrip).filter((l) => l.split(/\s+/).length >= 7 && (VERBS.test(l) || /\d+\s?%/.test(l))).slice(0, 10);
}

const LEAD: Record<string, string> = { friendly: "Thanks. ", professional: "", challenging: "Be specific. ", stress: "That did not convince me. " };

export const totalQuestions = (minutes: number) => Math.max(3, Math.min(12, Math.round(minutes / 2.5)));

export function nextQuestion(input: QuestionInput): GeneratedQuestion {
  const { config, resumeText = "", jdText = "", history } = input;
  const idx = history.length;
  const lead = idx === 0 ? "" : LEAD[config.style] ?? "";
  const asked = new Set(history.map((h) => h.question));
  const usedIds = new Set(QUESTION_BANK.filter((b) => asked.has(b.question) || [...asked].some((a) => a.endsWith(b.question))).map((b) => b.id));
  const last = history[history.length - 1];
  const lastWasFollowUp = last?.category === "followup";

  // 1. opening
  if (idx === 0 && !["technical", "situational", "leadership"].includes(config.type)) {
    return { question: "Tell me about yourself.", category: "hr", origin: "bank" };
  }
  // 2. probe the previous answer
  if (last?.evaluation.followUp && !lastWasFollowUp) {
    return { question: last.evaluation.followUp, category: "followup", origin: "followup" };
  }
  // 3. resume-driven question
  const useResume = (config.source === "resume" || config.source === "both" || config.type === "resume") && resumeText;
  if (useResume && idx % 2 === 0) {
    const claim = resumeClaims(resumeText).find((c) => ![...asked].some((a) => a.includes(c.slice(0, 40))));
    if (claim) {
      const short = claim.length > 140 ? `${claim.slice(0, 137)}…` : claim;
      const q = /detect|classif|model|predict|accuracy/i.test(claim)
        ? `Your resume says: "${short}" How did you evaluate how well it worked, and what happened with the cases it got wrong?`
        : /\d+\s?%|reduced|increased|improved/i.test(claim)
          ? `Your resume says: "${short}" How was that result measured, and what was your part in it?`
          : `Your resume says: "${short}" Walk me through one design decision you made there and the alternative you rejected.`;
      return { question: lead + q, category: "resume", origin: "resume" };
    }
  }
  // 4. job-description-driven question
  const useJd = (config.source === "jd" || config.source === "both" || config.type === "jd") && jdText;
  if (useJd && idx % 2 === 1) {
    const resumeSkills = new Set(extractSkills(resumeText));
    const gap = [...skillCounts(jdText).keys()].find((k) => !resumeSkills.has(k) && ![...asked].some((a) => a.includes(k)));
    if (gap) return { question: `${lead}This role asks for ${gap}. Where have you used it, or what is the closest thing you have done?`, category: "jd", origin: "jd" };
  }
  // 5. question bank
  const pick = candidates(config.type, config.role, config.experience, config.difficulty, usedIds)[0]
    ?? candidates("fresher", config.role, config.experience, "advanced", usedIds)[0]
    ?? QUESTION_BANK[0];
  return { question: lead + pick.question, category: pick.category, id: pick.id, origin: "bank" };
}
