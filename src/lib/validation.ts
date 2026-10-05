import { z } from "zod";

export const ConfigSchema = z.object({
  role: z.string().trim().min(2).max(80),
  experience: z.enum(["fresher", "0-2", "2-5", "5+"]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  style: z.enum(["friendly", "professional", "challenging", "stress"]),
  minutes: z.number().int().min(3).max(60),
  type: z.enum(["hr", "behavioral", "technical", "role", "resume", "jd", "situational", "leadership", "communication", "fresher"]),
  source: z.enum(["resume", "jd", "both", "generic"]),
});
const Category = z.enum(["hr", "behavioral", "technical", "situational", "leadership", "communication", "role", "resume", "jd", "followup"]);
const Text = (n: number) => z.string().max(n);

// Evaluations come back from the client on later requests, so they are validated too (never trusted blindly).
const EvalLite = z.object({
  criteria: z.record(z.string(), z.number().min(0).max(5)),
  score: z.number().min(0).max(100),
  signals: z.object({
    words: z.number(), sentences: z.number(), longestSentence: z.number(), fillerCount: z.number(), fillerPer100: z.number(),
    fillers: z.record(z.string(), z.number()), numbers: z.array(z.string().max(30)).max(100), firstPerson: z.number(), we: z.number(), wpm: z.number().optional(),
  }),
  feedback: z.object({ observation: Text(800), evidence: Text(800), whyItMatters: Text(800), recommendation: Text(800), practice: Text(800) }),
  expectation: z.object({ testing: Text(400), strongAnswerContains: z.array(Text(300)).max(10), weakened: z.array(Text(500)).max(10), structure: Text(500) }),
  strengths: z.array(Text(400)).max(6),
  followUp: Text(500).optional(),
  engine: z.enum(["rules", "ai"]),
});

export const NextSchema = z.object({
  config: ConfigSchema,
  resumeText: Text(30_000).optional(),
  jdText: Text(12_000).optional(),
  history: z.array(z.object({ question: Text(700), category: Category, answer: Text(6000), evaluation: EvalLite })).max(15),
});
export const EvaluateSchema = z.object({
  config: ConfigSchema, question: z.string().min(3).max(700), category: Category,
  answer: z.string().trim().min(1, "Write or record an answer first.").max(6000),
  seconds: z.number().min(0).max(3600), viaVoice: z.boolean(), resumeText: Text(30_000).optional(),
});
export const ReportSchema = z.object({
  config: ConfigSchema,
  turns: z.array(z.object({
    question: Text(700), category: Category, answer: Text(6000), seconds: z.number().min(0).max(3600), viaVoice: z.boolean(), evaluation: EvalLite,
  })).min(1).max(15),
});
export const PlanSchema = z.object({
  role: z.string().max(80), weakAreas: z.array(z.string().max(40)).max(6), resumeScore: z.number().min(0).max(100).nullable().optional(),
  speech: z.object({ avgWords: z.number(), totalFillers: z.number(), fillerPer100: z.number(), topFillers: z.array(z.string()), avgSeconds: z.number(), wpm: z.number().optional() }).optional(),
});
export const ResumeFieldsSchema = z.object({
  role: z.string().trim().max(80).default("Software Engineer"),
  experience: z.enum(["fresher", "0-2", "2-5", "5+"]).default("fresher"),
  jdText: z.string().max(12_000).optional(),
});
