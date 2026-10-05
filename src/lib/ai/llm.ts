import type { AnswerEvaluation, EvaluateInput, GeneratedQuestion, QuestionInput } from "@/types";
import { HeuristicProvider } from "./heuristic";
import { LlmEvaluationSchema, LlmQuestionSchema, parseAIJson } from "./schemas";
import { SYSTEM_RULES, wrapData } from "./prompts";
import { computeSignals } from "@/lib/interview/heuristics";
import { answerScore } from "@/lib/scoring";

interface LlmConfig { provider: "anthropic" | "openai"; apiKey: string; model: string; timeoutMs?: number }

/** Minimal vendor adapter: returns raw text or throws. All vendor specifics live here. */
async function callLLM(cfg: LlmConfig, system: string, user: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs ?? 25_000);
  try {
    if (cfg.provider === "openai") {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST", signal: ctrl.signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({ model: cfg.model, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
      });
      if (!r.ok) throw new Error(`openai ${r.status}`);
      return (await r.json()).choices?.[0]?.message?.content ?? "";
    }
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: ctrl.signal,
      headers: { "content-type": "application/json", "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: cfg.model, max_tokens: 1500, system, messages: [{ role: "user", content: user }] }),
    });
    if (!r.ok) throw new Error(`anthropic ${r.status}`);
    const data = await r.json();
    return (data.content ?? []).map((b: { text?: string }) => b.text ?? "").join("");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Real-LLM provider. It extends the rules engine so anything not yet implemented here
 * (resume analysis, reports, plans) keeps working, and any LLM failure falls back to rules.
 * Currently the LLM drives: next-question generation and answer evaluation.
 */
export class LlmProvider extends HeuristicProvider {
  readonly name: string;
  readonly mode = "ai" as const;
  constructor(private cfg: LlmConfig) { super(); this.name = `${cfg.provider}:${cfg.model}`; }

  async generateInterviewQuestion(i: QuestionInput): Promise<GeneratedQuestion> {
    // Opening and probing logic stay deterministic; the LLM writes mid-interview questions.
    if (i.history.length === 0) return super.generateInterviewQuestion(i);
    try {
      const transcript = i.history.map((h, n) => `Q${n + 1}: ${h.question}\nA${n + 1}: ${h.answer}`).join("\n\n");
      const user = `Interview config: role=${i.config.role}; level=${i.config.experience}; difficulty=${i.config.difficulty}; style=${i.config.style}; type=${i.config.type}.
Write the single best NEXT interview question. Probe a specific claim or gap in the previous answer when there is one; otherwise cover a new area suited to the role. Do not repeat earlier questions.
Return JSON: {"question": string, "category": "hr"|"behavioral"|"technical"|"situational"|"leadership"|"communication"|"role"|"resume"|"jd"|"followup"}
${wrapData("resume", i.resumeText ?? "", 4000)}
${wrapData("job_description", i.jdText ?? "", 3000)}
${wrapData("transcript", transcript, 6000)}`;
      const parsed = parseAIJson(await callLLM(this.cfg, SYSTEM_RULES, user), LlmQuestionSchema);
      if (parsed) return { question: parsed.question, category: parsed.category, origin: "ai" };
    } catch { /* fall through to rules */ }
    return super.generateInterviewQuestion(i);
  }

  async evaluateInterviewAnswer(i: EvaluateInput): Promise<AnswerEvaluation> {
    const base = await super.evaluateInterviewAnswer(i); // always compute objective signals locally
    try {
      const user = `Interview config: role=${i.config.role}; level=${i.config.experience}; difficulty=${i.config.difficulty}.
Question category: ${i.category}.
Score each criterion from 0 (absent) to 5 (excellent) using ONLY evidence in the answer. Include "correctness" and "reasoning" only for technical questions; include situation/task/action/result only for behavioral questions. Always include clarity, conciseness, structure, relevance, depth, evidence, impact, roleAlignment.
Return JSON: {"criteria":{name:number},"observation":string,"evidence":string,"why_it_matters":string,"recommendation":string,"practice":string,"testing":string,"strong_answer_contains":string[],"weakened":string[],"structure":string,"strengths":string[],"follow_up_question":string}
${wrapData("question", i.question, 600)}
${wrapData("answer", i.answer, 5000)}`;
      const p = parseAIJson(await callLLM(this.cfg, SYSTEM_RULES, user), LlmEvaluationSchema);
      if (!p) return base;
      const signals = computeSignals(i.answer, i.seconds, i.viaVoice);
      return {
        criteria: p.criteria, score: answerScore(p.criteria), signals, engine: "ai",
        feedback: { observation: p.observation, evidence: p.evidence, whyItMatters: p.why_it_matters, recommendation: p.recommendation, practice: p.practice },
        expectation: { testing: p.testing, strongAnswerContains: p.strong_answer_contains, weakened: p.weakened, structure: p.structure },
        strengths: p.strengths, followUp: p.follow_up_question || undefined,
      };
    } catch {
      return base;
    }
  }
}
