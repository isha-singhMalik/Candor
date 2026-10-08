import type { Experience, ResumeAnalysis, RewriteItem } from "@/types";
import { scoreResume } from "@/lib/scoring";
import { skillCounts, roleSkills } from "./skills";
import { matchJob } from "./match";

const ACTION_VERBS = new Set(`built developed designed implemented created led launched reduced increased improved optimized optimised automated analyzed analysed
engineered deployed migrated delivered integrated architected managed organized organised founded established trained mentored researched
tested debugged refactored configured secured detected evaluated achieved won presented collaborated authored shipped scaled streamlined resolved fixed`.split(/\s+/));

const WEAK_START = /^(worked (on|with)|responsible for|helped|assisted|involved in|participated in|handled|tasked with|was part of|duties included)\b/i;
const CLICHES = ["hard-working", "hardworking", "team player", "self-motivated", "passionate", "detail-oriented", "go-getter", "results-oriented", "quick learner", "references available", "dynamic"];
const PERSONAL_DATA = /(date of birth|d\.o\.b|marital status|father'?s name|nationality|religion|gender)\s*[:\-]/i;
const QUANT = /(\d+(\.\d+)?\s?(%|x\b|ms\b|k\b|\+)|[$₹]\s?\d|\bfrom \d+ to \d+|\b(?!(?:19|20)\d\d\b)\d{2,}\b)/i;

const SECTION_PATTERNS: Record<string, RegExp> = {
  Summary: /^(professional\s+)?(summary|profile|objective|about me)$/i,
  Education: /^education(al background)?$/i,
  Experience: /^(work\s+|professional\s+)?(experience|employment|internships?)$/i,
  Projects: /^(academic\s+|personal\s+)?projects?$/i,
  Skills: /^(technical\s+)?skills$|^core competencies$/i,
  Certifications: /^(certifications?|licenses?|courses?)$/i,
  Achievements: /^(achievements?|awards?|honou?rs|accomplishments)$/i,
};

const bulletStrip = (l: string) => l.replace(/^[\s\-•*▪●◦–>]+/, "").trim();
const wordCount = (t: string) => t.split(/\s+/).filter(Boolean).length;

export function analyzeResumeText(input: { text: string; role: string; experience: Experience; jdText?: string }): ResumeAnalysis {
  const text = input.text.replace(/\r/g, "").replace(/\t/g, " ");
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const words = wordCount(text);

  // --- sections ---
  const present: Record<string, boolean> = {};
  const lineSection: string[] = [];
  let current = "Header";
  for (const line of lines) {
    const clean = line.replace(/[:|]+$/, "").trim();
    const hit = clean.length <= 40 ? Object.entries(SECTION_PATTERNS).find(([, re]) => re.test(clean)) : undefined;
    if (hit) { present[hit[0]] = true; current = hit[0]; lineSection.push("HEADING"); continue; }
    lineSection.push(current);
  }
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(text);
  const hasPhone = /(\+?\d[\d\s\-().]{8,}\d)/.test(text);
  const hasLinks = /(linkedin\.com|github\.com|gitlab\.com|portfolio|behance\.net)/i.test(text);
  const sections = [
    ...["Summary", "Education", "Experience", "Projects", "Skills", "Certifications", "Achievements"].map((name) => ({ name, present: !!present[name] })),
    { name: "Contact details", present: hasEmail && hasPhone },
    { name: "Links (GitHub / LinkedIn)", present: hasLinks },
  ];

  // --- bullets ---
  const evidenceSections = new Set(["Experience", "Projects", "Achievements"]);
  const anySections = Object.keys(present).length > 0;
  const bullets = lines
    .map((l, i) => ({ text: bulletStrip(l), section: lineSection[i] }))
    .filter((b) => b.section !== "HEADING" && wordCount(b.text) >= 6 && (!anySections || evidenceSections.has(b.section)));
  const firstWord = (t: string) => t.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  const weak = bullets.filter((b) => WEAK_START.test(b.text));
  const quantified = bullets.filter((b) => QUANT.test(b.text));
  const strong = bullets.filter((b) => ACTION_VERBS.has(firstWord(b.text)) && !WEAK_START.test(b.text));
  const bulletLens = bullets.map((b) => wordCount(b.text));
  const longBullets = bullets.filter((b) => wordCount(b.text) > 35);

  // --- skills & role relevance ---
  const counts = skillCounts(text);
  const skillsFound = [...counts.keys()];
  const targetSkills = roleSkills(input.role);
  const roleHit = targetSkills.filter((k) => counts.has(k));
  const jd = input.jdText?.trim() ? matchJob(text, input.jdText, input.experience) : undefined;
  const stuffed = [...counts.entries()].filter(([, n]) => n >= 8).map(([k]) => k);
  const listedOnly = skillsFound.filter((k) => counts.get(k) === 1);

  // --- formatting risks ---
  const pipeLines = lines.filter((l) => (l.match(/\|/g)?.length ?? 0) >= 3 && !/@|linkedin|github/i.test(l)).length;
  const formattingRisk = pipeLines > 2 || /[\u2022\u25A0\u25CF]{3,}/.test(text);

  // --- ratios (each 0..1) ---
  const sectionWeights = { Education: 3, Experience: 2, Projects: 2, Skills: 3, Summary: 1, Certifications: 1, Achievements: 1 } as Record<string, number>;
  const sectionRatio = Object.entries(sectionWeights).reduce((a, [k, w]) => a + (present[k] ? w : 0), 0) / Object.values(sectionWeights).reduce((a, b) => a + b, 0);
  const expOrProj = present.Experience || present.Projects ? 1 : 0;
  const lenOk = words >= 250 && words <= (input.experience === "fresher" ? 750 : 1100) ? 1 : words >= 150 ? 0.5 : 0;
  const baseAts = 0.3 * ((present.Education ? 1 : 0) + (present.Skills ? 1 : 0) + expOrProj) / 3 + 0.25 * (hasEmail && hasPhone ? 1 : hasEmail ? 0.5 : 0) + 0.2 * lenOk + 0.25 * (formattingRisk ? 0 : 1) - (stuffed.length ? 0.1 : 0);
  const atsRatio = jd?.coverage != null ? 0.5 * baseAts + 0.5 * (jd.coverage / 100) : baseAts;
  const relevanceRatio = jd?.coverage != null ? jd.coverage / 100 : targetSkills.length ? roleHit.length / Math.min(targetSkills.length, 6) : Math.min(1, skillsFound.length / 6);
  const contentRatio = bullets.length ? Math.max(0, strong.length / bullets.length - 0.5 * (weak.length / bullets.length) - 0.2 * (longBullets.length / bullets.length) + 0.3) : 0.2;
  const impactRatio = bullets.length ? Math.min(1, quantified.length / bullets.length / 0.4) : 0;
  const structureRatio = 0.7 * sectionRatio + 0.15 * (hasLinks ? 1 : 0) + 0.15 * (bulletLens.length && bulletLens.every((n) => n <= 35) ? 1 : 0.4);
  const skillsRatio = Math.min(1, skillsFound.length / 10) * (present.Skills ? 1 : 0.6);

  const { dimensions, overall } = scoreResume(
    { ats: atsRatio, relevance: relevanceRatio, content: contentRatio, impact: impactRatio, structure: structureRatio, skills: skillsRatio },
    {
      ats: jd ? `Blends general parsing readiness with ${jd.coverage ?? 0}% keyword coverage of the pasted job description.` : "General parsing readiness: standard sections, contact details, length and formatting risks.",
      relevance: jd ? "Share of the job description's skills that appear in your resume." : `Coverage of common skills for "${input.role || "your target role"}".`,
      content: `${strong.length} of ${bullets.length} bullets open with a strong action verb; ${weak.length} open with a duty phrase.`,
      impact: `${quantified.length} of ${bullets.length} bullets include a measurable result.`,
      structure: `${sections.filter((s) => s.present).length} of ${sections.length} expected elements found.`,
      skills: `${skillsFound.length} recognised skills.`,
    },
  );

  // --- narrative ---
  const working: string[] = [];
  if (quantified.length) working.push(`${quantified.length} bullet${quantified.length > 1 ? "s include" : " includes"} a measurable result, which gives interviewers something concrete to probe.`);
  if (strong.length >= 2) working.push(`${strong.length} bullets open with a strong action verb.`);
  if (present.Projects) working.push("A projects section gives evidence beyond coursework.");
  if (roleHit.length >= 3) working.push(`Role-relevant skills are visible: ${roleHit.slice(0, 5).join(", ")}.`);
  if (hasLinks) working.push("Profile or code links are present, so recruiters can verify your work.");
  if (!working.length) working.push("The resume has readable text that a parser can extract.");

  const hurting: string[] = [];
  if (weak.length) hurting.push(`${weak.length} bullet${weak.length > 1 ? "s start" : " starts"} with duty phrases like "Worked on" or "Responsible for". These describe a job, not a result.`);
  if (bullets.length && quantified.length / bullets.length < 0.25) hurting.push(`Only ${quantified.length} of ${bullets.length} bullets show a measurable outcome. Most claims cannot be verified.`);
  if (listedOnly.length >= 3) hurting.push(`${listedOnly.length} skills appear only once, in a list, with no project or role showing them in use: ${listedOnly.slice(0, 5).join(", ")}.`);
  if (!hasLinks) hurting.push("No GitHub, LinkedIn or portfolio link. Recruiters cannot check your work.");
  if (!hasEmail || !hasPhone) hurting.push("Contact details are incomplete (email and phone should both be present).");
  if (formattingRisk) hurting.push("The layout may rely on tables, columns or symbol-heavy separators, which many parsers read out of order.");
  if (stuffed.length) hurting.push(`${stuffed.join(", ")} repeated 8+ times looks like keyword stuffing.`);
  if (longBullets.length) hurting.push(`${longBullets.length} bullet(s) run past 35 words. Long bullets get skimmed.`);
  if (words < 200) hurting.push("The resume is very short, so there is little evidence to assess.");

  const remove: string[] = [];
  const foundCliches = CLICHES.filter((c) => text.toLowerCase().includes(c));
  if (foundCliches.length) remove.push(`Generic phrases: ${foundCliches.map((c) => `"${c}"`).join(", ")}. Show the trait through a result instead.`);
  if (PERSONAL_DATA.test(text)) remove.push("Personal details such as date of birth, marital status, nationality or gender. They add no value and invite bias.");
  if (/objective/i.test(text) && /seeking|looking for (a|an) /i.test(text)) remove.push("A generic objective statement. Replace it with a two-line summary of what you can do.");

  const rewrite: RewriteItem[] = [...weak, ...bullets.filter((b) => !QUANT.test(b.text) && !WEAK_START.test(b.text))].slice(0, 4).map((b) => ({
    original: b.text,
    problem: WEAK_START.test(b.text)
      ? `Opens with a duty phrase ("${b.text.split(/\s+/).slice(0, 2).join(" ")}"). It describes responsibility, not what changed because of you.`
      : "States what you did but not what it achieved, so a recruiter cannot judge its value.",
    direction: "Lead with a strong verb, name the tool, then state the real outcome: \"Built X using Y, which [result you can verify].\" If you do not have a number, describe the concrete change instead. Do not estimate or invent one.",
  }));

  const missing: string[] = [];
  for (const k of ["Summary", "Skills", "Projects", "Experience", "Education"]) if (!present[k] && !(k === "Experience" && present.Projects) && !(k === "Projects" && present.Experience)) missing.push(`${k} section`);
  if (!hasLinks) missing.push("GitHub or LinkedIn link");
  if (jd?.missing.length) missing.push(...jd.missing.slice(0, 4).map((k) => `${k} (asked for in the posting; add only if you have used it)`));
  else if (targetSkills.length) missing.push(...targetSkills.filter((k) => !counts.has(k)).slice(0, 3).map((k) => `${k} (common for ${input.role || "this role"}; add only if true)`));

  const recruiterQuestions: string[] = [];
  if (listedOnly.length) recruiterQuestions.push(`You list ${listedOnly[0]}. Where did you actually use it?`);
  quantified.slice(0, 2).forEach((b) => recruiterQuestions.push(`"${b.text.slice(0, 90)}${b.text.length > 90 ? "…" : ""}" - how was that measured, and against what baseline?`));
  if (words < 250) recruiterQuestions.push("What else have you built or done that is not on this page?");
  if (!recruiterQuestions.length) recruiterQuestions.push("Which of these bullets best shows your individual contribution?");

  const interviewQuestions = bullets.filter((b) => ACTION_VERBS.has(firstWord(b.text)) || QUANT.test(b.text)).slice(0, 5).map((b) => {
    const short = b.text.length > 110 ? `${b.text.slice(0, 107)}…` : b.text;
    return /detect|classif|model|predict|accuracy/i.test(b.text)
      ? `"${short}" - how did you evaluate it, and how did you handle false positives?`
      : `"${short}" - what was your specific contribution, and what decision would you change?`;
  });

  return {
    overall, dimensions, sections, working, hurting, remove, rewrite, missing, recruiterQuestions, interviewQuestions,
    skillsFound, jd,
    stats: { words, bullets: bullets.length, quantified: quantified.length, weakStarts: weak.length },
    methodology: "Six weighted dimensions (ATS 20, role relevance 20, content 20, impact 15, structure 15, skills 10) are each measured from your text by transparent rules, then summed in code. Nothing is guessed by a language model.",
    disclaimer: "This is an estimated compatibility assessment, not a guarantee. ATS behaviour varies by employer, software, configuration and recruiter workflow; there is no single universal ATS algorithm.",
    engine: "rules",
  };
}
