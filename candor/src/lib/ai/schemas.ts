import { z } from "zod";

/** Shape we ask an LLM to return for an answer evaluation. Validated before use. */
export const LlmEvaluationSchema = z.object({
  criteria: z.record(z.string(), z.number().min(0).max(5)),
  observation: z.string().min(1).max(600),
  evidence: z.string().min(1).max(600),
  why_it_matters: z.string().min(1).max(600),
  recommendation: z.string().min(1).max(600),
  practice: z.string().min(1).max(600),
  testing: z.string().min(1).max(300),
  strong_answer_contains: z.array(z.string().max(200)).max(8),
  weakened: z.array(z.string().max(300)).max(6),
  structure: z.string().max(400),
  strengths: z.array(z.string().max(300)).max(4).default([]),
  follow_up_question: z.string().max(400).optional().default(""),
});
export type LlmEvaluation = z.infer<typeof LlmEvaluationSchema>;

export const LlmQuestionSchema = z.object({
  question: z.string().min(8).max(500),
  category: z.enum(["hr", "behavioral", "technical", "situational", "leadership", "communication", "role", "resume", "jd", "followup"]).default("role"),
});

/** Strip markdown fences, parse, validate. Never throws; returns null on any problem. */
export function parseAIJson<T>(raw: string, schema: z.ZodType<T>): T | null {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const parsed = JSON.parse(raw.slice(start, end + 1));
    const result = schema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export const LlmResumeSchema = z.object({
  rewrite: z.array(z.object({ original: z.string().min(10).max(400), problem: z.string().max(400), direction: z.string().max(500) })).max(6).default([]),
  working: z.array(z.string().max(300)).max(5).default([]),
  hurting: z.array(z.string().max(300)).max(6).default([]),
  recruiter_questions: z.array(z.string().max(300)).max(6).default([]),
  interview_questions: z.array(z.string().max(400)).max(6).default([]),
  jd_related: z.array(z.object({ skill: z.string().max(60), via: z.array(z.string().max(60)).max(5) })).max(8).default([]),
  jd_gaps: z.array(z.string().max(300)).max(6).default([]),
});

export const LlmReportSchema = z.object({
  brutal_truth: z.array(z.string().min(10).max(350)).min(1).max(5),
  strengths: z.array(z.string().max(300)).max(4).default([]),
  category_notes: z.record(z.string(), z.string().max(350)).default({}),
});

export const LlmPlanSchema = z.object({
  title: z.string().max(120),
  days: z.array(z.object({
    day: z.number().int().min(1).max(7), focus: z.string().max(120),
    minutes: z.number().int().min(10).max(180), tasks: z.array(z.string().max(300)).min(1).max(5),
  })).length(7),
});
