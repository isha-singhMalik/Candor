import type { AnswerEvaluation, Criteria, EvaluateInput, FeedbackBlock, Expectation, Signals } from "@/types";
import { answerScore, CRITERION_LABELS } from "@/lib/scoring";
import { extractSkills, roleSkills } from "@/lib/resume/skills";

// "like" and "just" are deliberately excluded: too many legitimate uses, so counting them would be noise.
const FILLERS = ["basically", "actually", "you know", "kind of", "sort of", "i mean", "literally", "honestly", "i guess", "um", "uh", "stuff like that", "and all"];
const clamp5 = (n: number) => Math.max(0, Math.min(5, Math.round(n * 10) / 10));
const count = (t: string, re: RegExp) => t.match(re)?.length ?? 0;

export function computeSignals(answer: string, seconds: number, viaVoice: boolean): Signals {
  const text = answer.trim();
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
  const fillers: Record<string, number> = {};
  const lower = ` ${text.toLowerCase().replace(/[^\w\s']/g, " ")} `;
  for (const f of FILLERS) {
    const n = count(lower, new RegExp(`\\s${f}\\s`, "g"));
    if (n) fillers[f] = n;
  }
  const fillerCount = Object.values(fillers).reduce((a, b) => a + b, 0);
  return {
    words: words.length,
    sentences: sentences.length,
    longestSentence: Math.max(0, ...sentences.map((s) => s.split(/\s+/).length)),
    fillerCount,
    fillerPer100: words.length ? Math.round((fillerCount / words.length) * 1000) / 10 : 0,
    fillers,
    numbers: text.match(/\d+(\.\d+)?\s?(%|x|ms|k)?/g)?.map((s) => s.trim()) ?? [],
    firstPerson: count(lower, /\si\s/g) + count(lower, /\s(my|me)\s/g),
    we: count(lower, /\s(we|our|us)\s/g),
    wpm: viaVoice && seconds >= 10 ? Math.round(words.length / (seconds / 60)) : undefined,
  };
}

const STAR = {
  situation: /\b(when|during|at the time|while|in my (last|final|third|second) |our team|the project|the problem|the challenge|the situation|context)\b/i,
  task: /\b(my (role|responsibility|task|goal|job)|i was (responsible|asked|assigned|tasked)|needed to|had to|the goal was|objective)\b/i,
  action: /\b(i (built|designed|implemented|wrote|created|developed|decided|chose|led|analy[sz]ed|tested|debugged|proposed|organi[sz]ed|set up|fixed|researched|reached out|talked|asked))\b/i,
  result: /\b(result(ed)?|as a result|outcome|reduced|increased|improved|saved|achieved|led to|which meant|ended up|we (won|shipped|launched)|i learned|learned that)\b/i,
};
const REASONING = /\b(because|trade-?off|instead of|alternative|compared (to|with)|rather than|the reason|decided|so that|which means|downside|limitation)\b/i;
const TECH_TERMS = /\b(api|database|index|query|cache|latency|throughput|algorithm|complexity|schema|endpoint|server|client|state|component|thread|encryption|authentication|authorization|token|model|dataset|accuracy|precision|recall|false positive|regression|pipeline|deployment|container|metric|baseline|hypothesis|variance|firewall|vulnerability|payload|session|cookie)\b/gi;
// STAR only applies to "tell me about a time" style questions, not HR openers or hypotheticals.
const BEHAVIORAL_CATS = new Set(["behavioral", "leadership", "resume", "followup"]);
const TECHNICAL_CATS = new Set(["technical", "role", "resume", "jd"]);

export function evaluateRules(input: EvaluateInput): AnswerEvaluation {
  const { answer, question, category, config } = input;
  const sig = computeSignals(answer, input.seconds, input.viaVoice);
  const w = sig.words;
  const lower = answer.toLowerCase();
  const avgSentence = sig.sentences ? w / sig.sentences : w;

  const star = Object.fromEntries(Object.entries(STAR).map(([k, re]) => [k, re.test(answer)])) as Record<keyof typeof STAR, boolean>;
  const starCount = Object.values(star).filter(Boolean).length;
  const connectors = count(lower, /\b(first|then|after that|finally|because|so that|therefore|as a result|for example)\b/g);
  const reasoning = count(lower, new RegExp(REASONING.source, "gi"));
  const techHits = (answer.match(TECH_TERMS) ?? []).length;
  const skillsMentioned = extractSkills(answer);
  const roleHits = roleSkills(config.role).filter((s) => skillsMentioned.includes(s));
  const qWords = question.toLowerCase().match(/[a-z]{5,}/g) ?? [];
  const overlap = qWords.length ? qWords.filter((qw) => lower.includes(qw.slice(0, 5))).length / qWords.length : 0;
  const hasNumber = sig.numbers.length > 0;

  const c: Criteria = {};
  c.clarity = clamp5(w < 15 ? 1 : 3 + (avgSentence >= 8 && avgSentence <= 24 ? 1 : 0) + (sig.longestSentence > 40 ? -1 : 0) + (sig.fillerPer100 > 3 ? -1.5 : sig.fillerPer100 > 1.5 ? -0.5 : 0.5));
  c.conciseness = clamp5(w < 25 ? 1.5 : w < 45 ? 2.5 : w <= 190 ? 4.5 : w <= 260 ? 3.5 : w <= 340 ? 2.5 : 1.5);
  c.structure = clamp5(w < 15 ? 1 : 1 + starCount * 0.6 + Math.min(connectors, 3) * 0.5 + (w >= 60 ? 0.5 : 0));
  c.relevance = clamp5(w < 15 ? 1 : 2 + (overlap >= 0.3 ? 1 : 0) + (skillsMentioned.length > 0 ? 1 : 0) + (w >= 40 ? 1 : 0));
  c.depth = clamp5(w < 15 ? 1 : 1 + Math.min(2, techHits / 2) + (reasoning > 0 ? 1 : 0) + (w >= 80 ? 1 : 0));
  c.evidence = clamp5(w < 15 ? 1 : 1 + (hasNumber ? 1.5 : 0) + (/\b(for example|for instance|specifically|in my project|i built|we built)\b/i.test(answer) ? 1.5 : 0) + (skillsMentioned.length ? 1 : 0));
  c.impact = clamp5(1 + (star.result ? 2 : 0) + (hasNumber ? 2 : 0));
  c.roleAlignment = clamp5(1 + Math.min(4, roleHits.length * 1.5 + (skillsMentioned.length ? 0.5 : 0)));
  if (BEHAVIORAL_CATS.has(category)) {
    c.situation = star.situation ? 4 : 1.5; c.task = star.task ? 4 : 1.5; c.action = star.action ? 4.5 : 1.5;
    c.result = star.result ? (hasNumber ? 5 : 3.5) : 1;
  }
  if (TECHNICAL_CATS.has(category)) {
    c.reasoning = clamp5(w < 15 ? 1 : 1.5 + Math.min(2.5, reasoning * 1.2) + (w >= 60 ? 1 : 0));
    c.tradeoffs = clamp5(/trade-?off|downside|limitation|alternative|rather than|instead of/i.test(answer) ? 4 : 1.5);
    // `correctness` is intentionally NOT set: rule-based mode cannot verify factual accuracy.
  }

  // ---- feedback on the weakest assessed criterion ----
  const weakest = Object.entries(c).filter(([k]) => k !== "roleAlignment").sort((a, b) => a[1] - b[1])[0][0];
  const fillerList = Object.entries(sig.fillers).map(([k, v]) => `"${k}" x${v}`).join(", ");
  const library: Record<string, FeedbackBlock> = {
    clarity: {
      observation: "Your answer was hard to follow in places.",
      evidence: sig.longestSentence > 40 ? `Your longest sentence ran ${sig.longestSentence} words.` : fillerList ? `You used filler words: ${fillerList}.` : `The answer was only ${w} words, too little to follow a line of reasoning.`,
      whyItMatters: "Interviewers decide within the first sentence or two whether they are following you. If they have to work to understand you, they stop giving you credit for the content.",
      recommendation: "Lead with your main point in one sentence, then give the reason, then one example.",
      practice: "Record yourself giving the same answer in three sentences, then expand it only if needed.",
    },
    conciseness: {
      observation: w < 45 ? "The answer was too thin to assess." : "The answer ran long before reaching its point.",
      evidence: `${w} words${input.seconds > 0 ? ` over ${Math.round(input.seconds)} seconds` : ""}. A typical well-structured answer is roughly 60 to 190 words.`,
      whyItMatters: w < 45 ? "A short answer gives the interviewer nothing to probe, so they will ask you to start over." : "Long answers bury the conclusion. The interviewer is left to guess which part mattered.",
      recommendation: w < 45 ? "Add one concrete example with what you did and what happened." : "Say the conclusion first, then support it with one example. Cut the rest.",
      practice: w < 45 ? "Re-answer using: context, what you did, what happened." : "Re-answer the same question in under 90 seconds.",
    },
    structure: {
      observation: "Your answer did not follow a recognisable structure.",
      evidence: `Only ${starCount} of 4 STAR elements (situation, task, action, result) were detectable, and there were ${connectors} signposting phrases.`,
      whyItMatters: "A structure lets the interviewer file your answer mentally. Without one, good points get lost.",
      recommendation: "Use Situation, Task, Action, Result for experience questions. Use Answer, Reason, Example for opinion questions.",
      practice: "Write the four STAR headings on paper and answer in order, one sentence each.",
    },
    relevance: {
      observation: "The answer drifted away from what was asked.",
      evidence: "Few words from the question, and no role-related skills, appeared in your answer.",
      whyItMatters: "Answering a different question than the one asked signals poor listening.",
      recommendation: "Repeat the key phrase of the question in your first sentence, then answer it directly.",
      practice: "Before answering, write the question's key verb and noun, then check that your answer contains both.",
    },
    depth: {
      observation: "Your answer named things but did not explain them.",
      evidence: `It contained ${techHits} technical term${techHits === 1 ? "" : "s"} and ${reasoning} reasoning phrase${reasoning === 1 ? "" : "s"} (such as "because" or "instead of").`,
      whyItMatters: "Interviewers test whether you understand why something works, not whether you have heard the word.",
      recommendation: "For every tool or approach you mention, add one sentence on why you chose it over an alternative.",
      practice: "Pick one technology on your resume and write three 'why' questions about it, then answer them aloud.",
    },
    evidence: {
      observation: "You made claims without showing proof.",
      evidence: hasNumber ? "A number appeared, but no concrete example surrounded it." : "No numbers, names of tools, or specific examples appeared in the answer.",
      whyItMatters: "Unsupported claims are easy to say and easy to doubt. Specifics are what make an answer believable.",
      recommendation: "Name the project, the tool and the outcome. If you do not have a measured result, describe the concrete change you saw.",
      practice: "For each claim in your resume, prepare one sentence that starts with 'For example, ...'.",
    },
    impact: {
      observation: "Your answer explained what you did but not why it mattered.",
      evidence: hasNumber ? "A number appeared but no outcome was stated." : "The answer contained no stated outcome and no measurable result.",
      whyItMatters: "Interviewers hire for outcomes. An action without a result reads as activity, not contribution.",
      recommendation: "End with what changed: time saved, errors reduced, users helped, or something you learned. Use real figures only.",
      practice: "Finish every practice answer with the sentence 'As a result, ...'.",
    },
    situation: { observation: "You jumped into the action without setting the scene.", evidence: "No context (when, where, what the problem was) was detectable before you described actions.", whyItMatters: "Without context the interviewer cannot judge how hard the problem was.", recommendation: "Open with one sentence of context: where you were and what was at stake.", practice: "Prefix each answer with 'At the time, ...' and keep it to one sentence." },
    task: { observation: "Your own responsibility was unclear.", evidence: "No phrase such as 'my role was' or 'I was responsible for' appeared.", whyItMatters: "Interviewers need to know what was yours versus the team's.", recommendation: "State your specific responsibility in one sentence before describing actions.", practice: "Say 'My part was ...' explicitly in your next three answers." },
    action: { observation: "The actions you took were not clear.", evidence: `I-statements about concrete actions were missing. You used "I/my" ${sig.firstPerson} times and "we/our" ${sig.we} times.`, whyItMatters: "The action is the core of a behavioral answer: it is the only part that shows what you would do on the job.", recommendation: "Describe two or three specific steps you personally took, in order.", practice: "Rewrite the answer replacing every 'we' with the specific thing you did." },
    result: { observation: "The answer stopped before the result.", evidence: "No outcome language (reduced, improved, resulted in, learned) was found.", whyItMatters: "Without a result, the interviewer does not know whether your approach worked.", recommendation: "End with the outcome. If it was not a success, say what you learned and what you changed.", practice: "Practise ending every story with a one-sentence result and a one-sentence lesson." },
    reasoning: { observation: "Your technical answer listed steps without justifying them.", evidence: `Only ${reasoning} reasoning phrase${reasoning === 1 ? "" : "s"} were found.`, whyItMatters: "Technical interviewers probe reasoning to separate memorised answers from understanding.", recommendation: "After each step, say why it comes before the next step.", practice: "Explain the same answer to a friend and have them keep asking 'why?'." },
    tradeoffs: { observation: "You gave one approach without discussing alternatives.", evidence: "No trade-off or alternative was mentioned (for example 'rather than', 'downside').", whyItMatters: "Engineers are paid to choose between imperfect options. Showing the trade-off shows judgment.", recommendation: "Name one alternative and one reason you would not choose it here.", practice: "For your next three technical answers, finish with 'The trade-off is ...'." },
  };
  const feedback = library[weakest];

  const strongest = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
  const strengths = strongest[1] >= 4 ? [`${CRITERION_LABELS[strongest[0]] ?? strongest[0]} was your strongest element in this answer.`] : [];
  if (hasNumber) strengths.push(`You included specifics (${sig.numbers.slice(0, 3).join(", ")}).`);

  // ---- interviewer-expectation engine ----
  const expectations: Record<string, Expectation> = {
    hr: { testing: "Self-awareness, motivation and whether you can communicate a clear story.", strongAnswerContains: ["A direct answer in the first sentence", "One concrete example that proves it", "A link to this specific role"], weakened: [], structure: "Answer, reason, example, link to the role." },
    behavioral: { testing: "Ownership, judgment under pressure and ability to learn from experience.", strongAnswerContains: ["Situation and why it mattered", "Your specific responsibility", "The actions you personally took", "The result, ideally measured", "What you learned"], weakened: [], structure: "Situation, Task, Action, Result (plus one-line lesson)." },
    technical: { testing: "Whether you understand how and why things work, and can reason about trade-offs.", strongAnswerContains: ["A correct core idea stated plainly", "Why this approach", "One alternative and its trade-off", "A failure case or limit"], weakened: [], structure: "Concept, how it works, trade-off, example." },
    situational: { testing: "Judgment and how you act without perfect information.", strongAnswerContains: ["What you would clarify first", "Options you considered", "The decision and why", "How you would know it worked"], weakened: [], structure: "Clarify, options, decision, check." },
    leadership: { testing: "Influence, accountability and how you bring others with you.", strongAnswerContains: ["The goal and the people involved", "How you handled disagreement", "What you personally decided", "The outcome for the team"], weakened: [], structure: "Context, your decision, how you aligned people, result." },
    communication: { testing: "Whether you can make something complex easy to follow.", strongAnswerContains: ["A plain-language summary first", "One analogy or example", "A check that the listener understood"], weakened: [], structure: "Headline, simple explanation, example." },
    role: { testing: "Whether your skills and examples match what this role actually needs.", strongAnswerContains: ["A relevant example from your own work", "The tools or methods used", "The result"], weakened: [], structure: "Example, approach, result." },
  };
  const key = category === "followup" || category === "resume" || category === "jd" ? "behavioral" : category;
  const expectation = { ...(expectations[key] ?? expectations.hr) };
  expectation.weakened = Object.entries(c).filter(([, v]) => v <= 2.5).slice(0, 3).map(([k]) => library[k]?.evidence).filter(Boolean) as string[];

  // ---- dynamic follow-up ----
  let followUp: string | undefined;
  const pct = answer.match(/\d+(\.\d+)?\s?%/);
  if (w < 25) followUp = "That was brief. Give me one specific example from your own work and walk me through what you did.";
  else if (pct) followUp = `You mentioned ${pct[0].replace(/\s/g, "")}. How did you measure that, and what was the baseline?`;
  else if (sig.we >= 3 && sig.we > sig.firstPerson) followUp = "You said 'we' several times. What was your specific contribution?";
  else if (BEHAVIORAL_CATS.has(category) && !star.result && !hasNumber) followUp = "What was the measurable outcome? If you cannot put a number on it, what concretely changed because of your work?";
  else if (TECHNICAL_CATS.has(category) && reasoning === 0) followUp = "Why did you choose that approach over an alternative?";

  return { criteria: c, score: answerScore(c), signals: sig, feedback, expectation, strengths, followUp, engine: "rules" };
}
