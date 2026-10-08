import type { ZodType } from "zod";
import type { AnswerEvaluation, EvaluateInput, GeneratedQuestion, InterviewReport, PlanInput, PracticePlan, QuestionInput, ReportInput, ResumeAnalysis } from "@/types";
import { HeuristicProvider } from "./heuristic";
import { LlmEvaluationSchema, LlmPlanSchema, LlmQuestionSchema, LlmReportSchema, LlmResumeSchema, parseAIJson } from "./schemas";
import { SYSTEM_RULES, wrapData } from "./prompts";
import { computeSignals } from "@/lib/interview/heuristics";
import { answerScore, CRITERION_LABELS } from "@/lib/scoring";

export interface LlmConfig { provider: "anthropic" | "openai"; apiKey: string; model: string; baseUrl?: string; label?: string; timeoutMs?: number }

/** Minimal vendor adapter: returns raw text or throws. All vendor specifics live here. */
export async function callLLM(cfg: LlmConfig, system: string, user: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs ?? 22_000);
  try {
    if (cfg.provider === "openai") {
      // OpenAI itself and every OpenAI-compatible host (Gemini, Groq, OpenRouter...) use this branch.
      const base = (cfg.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
      const r = await fetch(`${base}/chat/completions`, {
        method: "POST", signal: ctrl.signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({
          model: cfg.model,
          // JSON mode is only guaranteed on OpenAI itself; for other hosts we rely on the prompt + our own validation.
          ...(cfg.baseUrl ? {} : { response_format: { type: "json_object" } }),
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
        }),
      });
      if (!r.ok) throw new Error(`${cfg.label ?? "openai"} ${r.status}`);
      return (await r.json()).choices?.[0]?.message?.content ?? "";
    }
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: ctrl.signal,
      headers: { "content-type": "application/json", "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: cfg.model, max_tokens: 2500, system, messages: [{ role: "user", content: user }] }),
    });
    if (!r.ok) throw new Error(`anthropic ${r.status}`);
    const data = await r.json();
    return (data.content ?? []).map((b: { text?: string }) => b.text ?? "").join("");
  } finally {
    clearTimeout(timer);
  }
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const nums = (s: string) => s.match(/\d+(?:\.\d+)?/g) ?? [];
/** A number in model-written guidance must already exist in the candidate's own text, otherwise it is invented. */
export const numbersGrounded = (generated: string, ...sources: string[]) => {
  const pool = new Set(sources.flatMap(nums));
  return nums(generated).every((n) => pool.has(n));
};
const uniq = (a: string[]) => [...new Set(a)];

/**
 * Real-LLM provider. Extends the rules engine, so every method falls back to deterministic
 * output when the model errors, times out, or returns something that fails validation.
 * Scores are ALWAYS computed in code; the model supplies judgement, evidence and wording.
 */
export class LlmProvider extends HeuristicProvider {
  readonly name: string;
  readonly mode = "ai" as const;
  constructor(private cfg: LlmConfig) { super(); this.name = `${cfg.label ?? cfg.provider}:${cfg.model}`; }

  private async json<T>(user: string, schema: ZodType<T>): Promise<T | null> {
    try { return parseAIJson(await callLLM(this.cfg, SYSTEM_RULES, user), schema); } catch { return null; }
  }

  async generateInterviewQuestion(i: QuestionInput): Promise<GeneratedQuestion> {
    if (i.history.length === 0) return super.generateInterviewQuestion(i); // opening stays deterministic
    const transcript = i.history.map((h, n) => `Q${n + 1}: ${h.question}\nA${n + 1}: ${h.answer}`).join("\n\n");
    const p = await this.json(`Interview config: role=${i.config.role}; level=${i.config.experience}; difficulty=${i.config.difficulty}; style=${i.config.style}; type=${i.config.type}.
Write the single best NEXT interview question. Probe a specific claim or gap in the previous answer when there is one; otherwise cover a new area suited to the role. Never repeat an earlier question.
Return JSON: {"question": string, "category": "hr"|"behavioral"|"technical"|"situational"|"leadership"|"communication"|"role"|"resume"|"jd"|"followup"}
${wrapData("resume", i.resumeText ?? "", 4000)}
${wrapData("job_description", i.jdText ?? "", 3000)}
${wrapData("transcript", transcript, 6000)}`, LlmQuestionSchema);
    return p ? { question: p.question, category: p.category, origin: "ai" } : super.generateInterviewQuestion(i);
  }

  async evaluateInterviewAnswer(i: EvaluateInput): Promise<AnswerEvaluation> {
    const base = await super.evaluateInterviewAnswer(i); // objective signals are always computed locally
    const technical = ["technical", "role", "resume", "jd"].includes(i.category);
    const p = await this.json(`Interview config: role=${i.config.role}; level=${i.config.experience}; difficulty=${i.config.difficulty}.
Question category: ${i.category}.
Score each criterion from 0 (absent) to 5 (excellent) using ONLY evidence in the answer.
Always include: clarity, conciseness, structure, relevance, depth, evidence, impact, roleAlignment.
${technical ? 'This is a technical question: also include "correctness" (is what the candidate said factually right?), "reasoning" and "tradeoffs". Judge correctness strictly; if a statement is wrong, say exactly which one in "evidence".' : ""}
${["behavioral", "leadership", "resume", "followup"].includes(i.category) ? 'This is an experience question: also include situation, task, action, result.' : ""}
Return JSON: {"criteria":{name:number},"observation":string,"evidence":string,"why_it_matters":string,"recommendation":string,"practice":string,"testing":string,"strong_answer_contains":string[],"weakened":string[],"structure":string,"strengths":string[],"follow_up_question":string}
${wrapData("question", i.question, 600)}
${wrapData("answer", i.answer, 5000)}`, LlmEvaluationSchema);
    if (!p) return base;
    const criteria = Object.fromEntries(Object.entries(p.criteria).filter(([k]) => k in CRITERION_LABELS));
    if (!Object.keys(criteria).length) return base;
    return {
      criteria, score: answerScore(criteria), signals: computeSignals(i.answer, i.seconds, i.viaVoice), engine: "ai",
      feedback: { observation: p.observation, evidence: p.evidence, whyItMatters: p.why_it_matters, recommendation: p.recommendation, practice: p.practice },
      expectation: { testing: p.testing, strongAnswerContains: p.strong_answer_contains, weakened: p.weakened, structure: p.structure },
      strengths: p.strengths, followUp: p.follow_up_question || undefined,
    };
  }

  async analyzeResume(i: Parameters<HeuristicProvider["analyzeResume"]>[0]): Promise<ResumeAnalysis> {
    const base = await super.analyzeResume(i); // all scores come from the rules; the model adds judgement and wording
    const p = await this.json(`Target role: ${i.role}; level: ${i.experience}.
Review this resume like a careful recruiter. Rules-based findings already found: ${JSON.stringify({ hurting: base.hurting, remove: base.remove })}. Add insight that goes beyond them.
Return JSON: {"rewrite":[{"original":string,"problem":string,"direction":string}],"working":string[],"hurting":string[],"recruiter_questions":string[],"interview_questions":string[],"jd_related":[{"skill":string,"via":string[]}],"jd_gaps":string[]}
HARD RULES: "original" must be copied exactly from the resume. Never invent numbers, metrics, employers, tools or achievements. If a bullet lacks a measurable result, "direction" must ask the candidate for their real result. jd_related/jd_gaps only if a job description is provided; "via" lists skills that are actually on the resume.
${wrapData("resume", i.text, 12000)}
${wrapData("job_description", i.jdText ?? "", 5000)}`, LlmResumeSchema);
    if (!p) return base;
    const hay = norm(i.text);
    const rewrite = p.rewrite.filter((r) => hay.includes(norm(r.original)) && numbersGrounded(`${r.problem} ${r.direction}`, i.text)).slice(0, 5);
    const jd = base.jd && {
      ...base.jd,
      related: p.jd_related.length ? p.jd_related.filter((r) => r.via.every((v) => hay.includes(norm(v)))) : base.jd.related,
      gaps: uniq([...base.jd.gaps, ...p.jd_gaps]).slice(0, 8),
    };
    return {
      ...base, jd, engine: "ai",
      rewrite: rewrite.length ? rewrite : base.rewrite,
      working: uniq([...base.working, ...p.working]).slice(0, 6),
      hurting: uniq([...base.hurting, ...p.hurting]).slice(0, 8),
      recruiterQuestions: p.recruiter_questions.length ? p.recruiter_questions : base.recruiterQuestions,
      interviewQuestions: p.interview_questions.length ? p.interview_questions : base.interviewQuestions,
    };
  }

  async generateInterviewReport(i: ReportInput): Promise<InterviewReport> {
    const base = await super.generateInterviewReport(i); // scores are computed in code
    const digest = i.turns.map((t, n) => `Q${n + 1} (${t.category}, score ${t.evaluation.score}, ${t.evaluation.signals.words} words, ${t.evaluation.signals.fillerCount} fillers): ${t.question}\nAnswer: ${t.answer}\nCriteria: ${JSON.stringify(t.evaluation.criteria)}`).join("\n\n");
    const p = await this.json(`Role: ${i.config.role}; level: ${i.config.experience}. Overall score computed by the application: ${base.overall}/100. Category scores: ${JSON.stringify(base.categories.map((c) => [c.key, c.score]))}.
Write the candidate's "What you need to hear" section: 3 to 5 direct, constructive statements. Each must cite specific evidence from their answers (a question number, a filler word, a missing result). Never insult. Never comment on personality, honesty, intelligence or appearance.
Return JSON: {"brutal_truth":string[],"strengths":string[],"category_notes":{"communication":string,"content":string,"behavioral":string,"technical":string,"roleAlignment":string}}
${wrapData("interview", digest, 12000)}`, LlmReportSchema);
    if (!p) return base;
    return {
      ...base, engine: "ai", brutalTruth: p.brutal_truth, strengths: p.strengths.length ? p.strengths : base.strengths,
      categories: base.categories.map((c) => ({ ...c, explanation: p.category_notes[c.key] ? `${c.explanation} ${p.category_notes[c.key]}` : c.explanation })),
    };
  }

  async generatePracticePlan(i: PlanInput): Promise<PracticePlan> {
    const base = await super.generatePracticePlan(i);
    const weak = i.weakAreas.map((k) => CRITERION_LABELS[k] ?? k).join(", ") || "none identified";
    const p = await this.json(`Create a 7-day interview preparation plan for the role "${i.role}". Weakest criteria (weakest first): ${weak}. Resume readiness: ${i.resumeScore ?? "unknown"}/100. Speech: ${JSON.stringify(i.speech ?? {})}.
Day 1 resume, day 2 tell-me-about-yourself, day 3 technical fundamentals, day 4 behavioral, day 5 mock interview, day 6 weak-area drills, day 7 final simulation. Tasks must be concrete and doable. Never promise outcomes.
Return JSON: {"title":string,"days":[{"day":number,"focus":string,"minutes":number,"tasks":string[]}]} with exactly 7 days.`, LlmPlanSchema);
    return p ? p : base;
  }
}
