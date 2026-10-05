export type Experience = "fresher" | "0-2" | "2-5" | "5+";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type Style = "friendly" | "professional" | "challenging" | "stress";
export type InterviewType =
  | "hr" | "behavioral" | "technical" | "role" | "resume"
  | "jd" | "situational" | "leadership" | "communication" | "fresher";
export type QuestionSource = "resume" | "jd" | "both" | "generic";
export type QuestionCategory =
  | "hr" | "behavioral" | "technical" | "situational" | "leadership"
  | "communication" | "role" | "resume" | "jd" | "followup";
export type CategoryKey = "communication" | "content" | "behavioral" | "technical" | "roleAlignment";
export type Criteria = Record<string, number>; // each criterion 0..5

export interface InterviewConfig {
  role: string;
  experience: Experience;
  difficulty: Difficulty;
  style: Style;
  minutes: number;
  type: InterviewType;
  source: QuestionSource;
}

export interface Profile {
  name: string; email: string; education: string; degree: string; college: string;
  gradYear: string; experience: Experience; targetRole: string; targetIndustry: string;
  targetCompanies: string; skills: string; interviewType: InterviewType;
}

// ---------- Resume ----------
export interface ScoreDimension { key: string; label: string; max: number; score: number; note: string }
export interface RewriteItem { original: string; problem: string; direction: string }
export interface JobMatch {
  matched: string[];
  missing: string[];
  related: { skill: string; via: string[] }[];
  gaps: string[];
  suggestions: string[];
  coverage: number | null;
}
export interface ResumeAnalysis {
  overall: number;
  dimensions: ScoreDimension[];
  sections: { name: string; present: boolean }[];
  working: string[];
  hurting: string[];
  remove: string[];
  rewrite: RewriteItem[];
  missing: string[];
  recruiterQuestions: string[];
  interviewQuestions: string[];
  skillsFound: string[];
  jd?: JobMatch;
  stats: { words: number; bullets: number; quantified: number; weakStarts: number };
  methodology: string;
  disclaimer: string;
  engine: "rules" | "ai";
}

// ---------- Interview ----------
export interface Signals {
  words: number;
  sentences: number;
  longestSentence: number;
  fillerCount: number;
  fillerPer100: number;
  fillers: Record<string, number>;
  numbers: string[];
  firstPerson: number;
  we: number;
  wpm?: number;
}
export interface FeedbackBlock {
  observation: string; evidence: string; whyItMatters: string; recommendation: string; practice: string;
}
export interface Expectation { testing: string; strongAnswerContains: string[]; weakened: string[]; structure: string }
export interface AnswerEvaluation {
  criteria: Criteria;
  score: number;
  signals: Signals;
  feedback: FeedbackBlock;
  expectation: Expectation;
  strengths: string[];
  followUp?: string;
  engine: "rules" | "ai";
}
export interface Turn {
  question: string;
  category: QuestionCategory;
  answer: string;
  seconds: number;
  viaVoice: boolean;
  evaluation: AnswerEvaluation;
}
export interface GeneratedQuestion { question: string; category: QuestionCategory; id?: string; origin: "bank" | "followup" | "resume" | "jd" | "ai" }
export interface QuestionInput {
  config: InterviewConfig; resumeText?: string; jdText?: string;
  history: Pick<Turn, "question" | "category" | "answer" | "evaluation">[];
}
export interface EvaluateInput {
  config: InterviewConfig; question: string; category: QuestionCategory; answer: string;
  seconds: number; viaVoice: boolean; resumeText?: string;
}
export interface CategoryResult { key: CategoryKey; label: string; score: number | null; explanation: string; evidence: string[] }
export interface InterviewReport {
  overall: number;
  categories: CategoryResult[];
  speech: { avgWords: number; totalFillers: number; fillerPer100: number; topFillers: string[]; avgSeconds: number; wpm?: number };
  brutalTruth: string[];
  strengths: string[];
  weakAreas: string[]; // criterion keys, weakest first
  notes: string[];
  engine: "rules" | "ai";
}
export interface ReportInput { config: InterviewConfig; turns: Turn[] }
export interface PlanDay { day: number; focus: string; minutes: number; tasks: string[] }
export interface PracticePlan { title: string; days: PlanDay[] }
export interface PlanInput {
  role: string; weakAreas: string[]; resumeScore?: number | null; speech?: InterviewReport["speech"];
}
export interface InterviewRecord {
  id: string; date: string; config: InterviewConfig; report: InterviewReport | null;
  turns: Turn[]; plan?: PracticePlan; sample?: boolean;
  summary: { overall: number; communication: number | null; technical: number | null; roleAlignment: number | null };
}
