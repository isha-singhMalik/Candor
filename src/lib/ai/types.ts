import type {
  AnswerEvaluation, EvaluateInput, GeneratedQuestion, InterviewReport, JobMatch, PlanInput,
  PracticePlan, QuestionInput, ReportInput, ResumeAnalysis, Experience,
} from "@/types";

/**
 * The only surface the application uses to reach "AI". Swap providers by implementing this
 * interface; nothing in the UI or API routes knows which vendor is behind it.
 */
export interface AIProvider {
  readonly name: string;
  readonly mode: "demo" | "ai";
  generateInterviewQuestion(input: QuestionInput): Promise<GeneratedQuestion>;
  evaluateInterviewAnswer(input: EvaluateInput): Promise<AnswerEvaluation>;
  analyzeResume(input: { text: string; role: string; experience: Experience; jdText?: string }): Promise<ResumeAnalysis>;
  matchResumeToJob(input: { resumeText: string; jdText: string; experience: Experience }): Promise<JobMatch>;
  generateInterviewReport(input: ReportInput): Promise<InterviewReport>;
  generatePracticePlan(input: PlanInput): Promise<PracticePlan>;
}
