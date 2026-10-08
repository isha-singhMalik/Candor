import type { AIProvider } from "./types";
import type { EvaluateInput, PlanInput, QuestionInput, ReportInput } from "@/types";
import { analyzeResumeText } from "@/lib/resume/analyze";
import { matchJob } from "@/lib/resume/match";
import { evaluateRules } from "@/lib/interview/heuristics";
import { nextQuestion } from "@/lib/interview/questions";
import { buildReport } from "@/lib/interview/report";
import { buildPlan } from "@/lib/interview/plan";

/** Deterministic, offline provider. This is Candor's Demo Mode and the fallback if a real provider fails. */
export class HeuristicProvider implements AIProvider {
  readonly name: string = "Candor rules engine";
  readonly mode: "demo" | "ai" = "demo";
  async generateInterviewQuestion(i: QuestionInput) { return nextQuestion(i); }
  async evaluateInterviewAnswer(i: EvaluateInput) { return evaluateRules(i); }
  async analyzeResume(i: Parameters<AIProvider["analyzeResume"]>[0]) { return analyzeResumeText(i); }
  async matchResumeToJob(i: Parameters<AIProvider["matchResumeToJob"]>[0]) { return matchJob(i.resumeText, i.jdText, i.experience); }
  async generateInterviewReport(i: ReportInput) { return buildReport(i); }
  async generatePracticePlan(i: PlanInput) { return buildPlan(i); }
}
