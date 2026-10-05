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
