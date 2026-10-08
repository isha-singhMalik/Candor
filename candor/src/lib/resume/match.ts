import type { Experience, JobMatch } from "@/types";
import { extractSkills, skillCounts, skillDef } from "./skills";

const LEVEL_YEARS: Record<Experience, number> = { fresher: 0, "0-2": 1, "2-5": 3.5, "5+": 6 };

/** Compare a resume with a pasted job description. Pure and deterministic. */
export function matchJob(resumeText: string, jdText: string, experience: Experience = "fresher"): JobMatch {
  const resumeSkills = new Set(extractSkills(resumeText));
  const jdCounts = skillCounts(jdText);
  const jdSkills = [...jdCounts.keys()];

  const matched = jdSkills.filter((k) => resumeSkills.has(k));
  const missing = jdSkills.filter((k) => !resumeSkills.has(k));

  const related = missing
    .map((skill) => ({ skill, via: (skillDef(skill)?.related ?? []).filter((r) => resumeSkills.has(r)) }))
    .filter((r) => r.via.length > 0);

  const gaps: string[] = [];
  const years = [...jdText.matchAll(/(\d+)\s*\+?\s*(?:years?|yrs)/gi)].map((m) => Number(m[1])).filter((n) => n > 0 && n < 20);
  if (years.length) {
    const need = Math.max(...years);
    if (need > LEVEL_YEARS[experience]) {
      gaps.push(`The posting mentions ${need}+ years of experience. Your profile level (${experience}) is below that, so projects and internships need to carry real evidence.`);
    }
  }
  for (const [skill, n] of jdCounts) {
    if (!resumeSkills.has(skill) && n >= 2) gaps.push(`The posting stresses ${skill} (mentioned ${n} times) but your resume does not show it.`);
  }
  for (const word of ["lead", "mentor", "ownership", "stakeholder", "cross-functional"]) {
    if (new RegExp(`\\b${word}`, "i").test(jdText) && !new RegExp(`\\b${word}`, "i").test(resumeText)) {
      gaps.push(`The posting expects "${word}" experience; nothing on your resume clearly demonstrates it.`);
    }
  }

  const suggestions = missing.slice(0, 6).map((skill) =>
    `Add "${skill}" only if you have genuinely used it (a project, internship or coursework). If you have not, learn it first or leave it out.`);

  return {
    matched, missing, related, gaps: gaps.slice(0, 6), suggestions,
    coverage: jdSkills.length ? Math.round((matched.length / jdSkills.length) * 100) : null,
  };
}
