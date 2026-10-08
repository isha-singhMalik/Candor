import type { Difficulty, Experience, InterviewType, QuestionCategory } from "@/types";

export interface BankQuestion {
  id: string;
  category: QuestionCategory;
  difficulty: Difficulty;
  role: string[];            // role keywords, "*" = any
  experience_level: Experience[];
  skills: string[];
  question: string;
  evaluation_criteria: string[];
  follow_up_rules: string[];
}

const ANY: Experience[] = ["fresher", "0-2", "2-5", "5+"];
const defaultRules: Record<string, string[]> = {
  hr: ["If the answer is under 25 words, ask for one specific example.", "If no concrete motivation is given, ask what they researched about the role."],
  behavioral: ["If no result is stated, ask for the measurable outcome.", "If the answer says 'we' repeatedly, ask for the candidate's own contribution."],
  technical: ["If a tool is named without a reason, ask why it was chosen over an alternative.", "If the answer is correct but shallow, ask about a failure case or trade-off."],
  situational: ["Ask what information the candidate would gather first.", "Ask how they would know the decision worked."],
  leadership: ["Ask how the candidate handled disagreement.", "Ask what they would do differently."],
  communication: ["Ask the candidate to restate the answer in two sentences."],
  role: ["Ask for a concrete example from a project."],
};
const criteriaFor: Record<string, string[]> = {
  hr: ["clarity", "relevance", "structure"],
  behavioral: ["situation", "task", "action", "result"],
  technical: ["reasoning", "depth", "tradeoffs"],
  situational: ["reasoning", "structure", "relevance"],
  leadership: ["action", "result", "evidence"],
  communication: ["clarity", "conciseness", "structure"],
  role: ["depth", "roleAlignment", "evidence"],
};

let n = 0;
const q = (category: QuestionCategory, difficulty: Difficulty, role: string[], skills: string[], question: string, levels: Experience[] = ANY): BankQuestion => ({
  id: `q${String(++n).padStart(3, "0")}`, category, difficulty, role, experience_level: levels, skills, question,
  evaluation_criteria: criteriaFor[category] ?? ["clarity"], follow_up_rules: defaultRules[category] ?? [],
});

const SW = ["software", "developer", "engineer", "web"];
const DA = ["data"]; const SEC = ["cyber", "security"]; const PM = ["product"]; const MK = ["marketing"];

export const QUESTION_BANK: BankQuestion[] = [
  q("hr", "beginner", ["*"], [], "Why are you interested in this role, and what have you done to prepare for it?"),
  q("hr", "beginner", ["*"], [], "What would you say is your strongest skill, and where have you proved it?"),
  q("hr", "intermediate", ["*"], [], "Tell me about a weakness you are actively working on. What have you changed so far?"),
  q("hr", "intermediate", ["*"], [], "Where do you want to be in three years, and how does this role get you there?"),
  q("hr", "advanced", ["*"], [], "Why should we hire you over a candidate with more experience?"),
  q("behavioral", "beginner", ["*"], [], "Tell me about a time you had to learn something quickly to finish a project."),
  q("behavioral", "intermediate", ["*"], [], "Describe a time you disagreed with a teammate. What did you do and how did it end?"),
  q("behavioral", "intermediate", ["*"], [], "Tell me about a project that did not go as planned. What was your part in that?"),
  q("behavioral", "advanced", ["*"], [], "Describe a time you had to deliver under a tight deadline. What did you cut and why?"),
  q("situational", "intermediate", ["*"], [], "You are given a task with unclear requirements and the person who set it is unavailable. What do you do?"),
  q("situational", "advanced", ["*"], [], "A teammate keeps missing deadlines and it is putting your delivery at risk. How do you handle it?"),
  q("leadership", "intermediate", ["*"], [], "Tell me about a time you led others, even without a formal title. What did you do?", ["fresher", "0-2", "2-5", "5+"]),
  q("leadership", "advanced", ["*"], [], "Describe a decision you made that others disagreed with. How did you bring them along?", ["2-5", "5+"]),
  q("communication", "beginner", ["*"], [], "Explain a technical or complex idea you know well to someone with no background in it."),
  q("communication", "intermediate", ["*"], [], "Summarise your most significant project in under a minute."),
  q("technical", "beginner", SW, ["Git"], "What is the difference between git merge and git rebase, and when would you use each?"),
  q("technical", "beginner", SW, ["SQL"], "Explain the difference between an INNER JOIN and a LEFT JOIN with an example."),
  q("technical", "intermediate", SW, ["REST API"], "Walk me through what happens from the moment a user clicks 'Place order' to the order being stored. Where could it fail?"),
  q("technical", "intermediate", SW, ["SQL"], "A query on a large table is slow. How do you investigate and what could you change?"),
  q("technical", "intermediate", SW, ["React"], "How would you decide where state should live in a React application?"),
  q("technical", "advanced", SW, ["System Design"], "Design a URL shortener. What are the main components and where would it first break at scale?"),
  q("technical", "beginner", DA, ["SQL"], "How would you find duplicate records in a table and decide which to keep?"),
  q("technical", "intermediate", DA, ["Statistics"], "A key metric dropped 15% this week. How do you work out why?"),
  q("technical", "intermediate", DA, ["Python", "Pandas"], "You have a dataset with many missing values. How do you decide what to do with them?"),
  q("technical", "advanced", DA, ["A/B Testing"], "An A/B test shows a small lift that is not statistically significant. What do you recommend?"),
  q("technical", "beginner", SEC, ["Network Security"], "Explain the CIA triad and give an example of a control for each part."),
  q("technical", "intermediate", SEC, ["OWASP"], "What is the difference between XSS and CSRF, and how do you defend against each?"),
  q("technical", "intermediate", SEC, ["Incident Response"], "You see a spike of failed logins followed by one success from a new country. Walk me through your response."),
  q("technical", "advanced", SEC, ["Penetration Testing"], "How would you scope and prioritise findings from a vulnerability scan of 400 hosts?"),
  q("role", "beginner", PM, [], "How would you decide which of three requested features to build first?"),
  q("role", "intermediate", PM, ["A/B Testing"], "How would you measure whether a new onboarding flow worked?"),
  q("role", "beginner", MK, [], "How would you judge whether a campaign was successful beyond clicks?"),
  q("role", "intermediate", MK, ["SEO"], "You have a small budget and need more qualified traffic. What do you try first and why?"),
];

const TYPE_CATEGORIES: Record<InterviewType, QuestionCategory[]> = {
  hr: ["hr"], behavioral: ["behavioral"], technical: ["technical"], role: ["role", "technical"],
  resume: ["hr", "behavioral", "technical"], jd: ["role", "technical", "behavioral"],
  situational: ["situational"], leadership: ["leadership", "behavioral"], communication: ["communication"],
  fresher: ["hr", "behavioral", "technical"],
};
const RANK: Record<Difficulty, number> = { beginner: 0, intermediate: 1, advanced: 2 };

export function candidates(type: InterviewType, role: string, experience: Experience, difficulty: Difficulty, usedIds: Set<string>): BankQuestion[] {
  const cats = TYPE_CATEGORIES[type];
  const r = role.toLowerCase();
  const pool = QUESTION_BANK.filter((b) => !usedIds.has(b.id) && cats.includes(b.category)
    && RANK[b.difficulty] <= RANK[difficulty] && b.experience_level.includes(experience)
    && (b.role.includes("*") || b.role.some((k) => r.includes(k))));
  // Role-specific first, then closest difficulty first, then rotate categories for variety.
  return pool.sort((a, b) => Number(b.role.includes("*") ? 0 : 1) - Number(a.role.includes("*") ? 0 : 1)
    || Math.abs(RANK[a.difficulty] - RANK[difficulty]) - Math.abs(RANK[b.difficulty] - RANK[difficulty]));
}
