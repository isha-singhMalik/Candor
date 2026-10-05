export interface SkillDef { name: string; aliases: string[]; related: string[] }

const s = (name: string, aliases: string[] = [], related: string[] = []): SkillDef => ({
  name, aliases: [name.toLowerCase(), ...aliases], related,
});

export const SKILLS: SkillDef[] = [
  s("Python", [], ["Pandas", "NumPy", "Django", "Flask", "FastAPI"]),
  s("JavaScript", ["js", "es6"], ["TypeScript", "Node.js", "React"]),
  s("TypeScript", [], ["JavaScript", "React"]),
  s("React", ["react.js", "reactjs"], ["JavaScript", "Next.js", "HTML", "CSS"]),
  s("Next.js", ["nextjs"], ["React", "Node.js"]),
  s("Node.js", ["nodejs", "node"], ["JavaScript", "Express", "REST API"]),
  s("Express", ["express.js", "expressjs"], ["Node.js", "REST API"]),
  s("Angular", [], ["TypeScript", "JavaScript"]),
  s("Vue", ["vue.js", "vuejs"], ["JavaScript"]),
  s("HTML", ["html5"]), s("CSS", ["css3"]), s("Tailwind", ["tailwindcss", "tailwind css"], ["CSS"]),
  s("Java", [], ["Spring Boot", "OOP"]), s("C++", ["cpp"], ["Data Structures", "Algorithms"]), s("C#", ["c sharp"]),
  s("Golang", ["go lang"]),
  s("SQL", [], ["PostgreSQL", "MySQL"]),
  s("MySQL", [], ["SQL"]), s("PostgreSQL", ["postgres"], ["SQL"]), s("MongoDB", ["mongo"], ["Node.js"]), s("Redis"),
  s("Git", [], ["GitHub", "CI/CD"]), s("GitHub", [], ["Git"]),
  s("Docker", [], ["Linux", "CI/CD", "AWS", "Kubernetes"]),
  s("Kubernetes", ["k8s"], ["Docker", "AWS", "Linux"]),
  s("AWS", ["amazon web services", "ec2", "s3"], ["Linux", "Docker"]),
  s("Azure", [], ["AWS"]), s("GCP", ["google cloud"], ["AWS"]),
  s("Linux", ["ubuntu", "bash"], ["Docker"]),
  s("CI/CD", ["cicd", "github actions", "jenkins"], ["Git", "Docker"]),
  s("REST API", ["rest", "restful", "rest apis", "restful apis", "apis"], ["Express", "Node.js", "Django", "Flask"]),
  s("GraphQL", [], ["REST API"]),
  s("Django", [], ["Python"]), s("Flask", [], ["Python"]), s("FastAPI", [], ["Python"]), s("Spring Boot", ["springboot", "spring"], ["Java"]),
  s("Pandas", [], ["Python", "NumPy"]), s("NumPy", [], ["Python"]),
  s("Machine Learning", ["ml", "scikit-learn", "sklearn"], ["Python", "Pandas", "Statistics"]),
  s("Deep Learning", [], ["Machine Learning", "TensorFlow", "PyTorch"]),
  s("TensorFlow", [], ["Machine Learning", "Python"]), s("PyTorch", [], ["Machine Learning", "Python"]),
  s("NLP", ["natural language processing"], ["Machine Learning", "Python"]),
  s("Excel", ["microsoft excel", "advanced excel"]), s("Power BI", ["powerbi"], ["Excel", "SQL"]),
  s("Tableau", [], ["Data Visualization"]), s("Statistics", ["statistical analysis"], ["Python", "Excel"]),
  s("Data Visualization", ["data visualisation", "dashboards"], ["Tableau", "Power BI"]), s("ETL", [], ["SQL", "Python"]),
  s("Jira", [], ["Agile"]), s("Agile", ["scrum", "kanban"], ["Jira"]), s("Figma", [], ["User Research"]),
  s("Testing", ["jest", "pytest", "unit testing", "unit tests", "test automation", "selenium"]),
  s("Microservices", [], ["Docker", "REST API"]), s("System Design", [], ["Microservices"]),
  s("Data Structures", ["dsa"], ["Algorithms"]), s("Algorithms", [], ["Data Structures"]),
  s("OOP", ["object-oriented", "object oriented"], ["Java", "C++"]),
  s("SEO", [], ["Content Marketing", "Google Analytics"]), s("Google Analytics", ["ga4"], ["SEO"]),
  s("Content Marketing", [], ["SEO"]), s("Email Marketing", ["mailchimp"]), s("Social Media", ["social media marketing"]),
  s("A/B Testing", ["ab testing", "a/b tests"], ["Statistics"]), s("Roadmapping", ["product roadmap"], ["Agile"]),
  s("User Research", ["user interviews", "usability testing"], ["Figma"]),
  s("Network Security", ["firewalls", "firewall", "ids/ips"], ["Linux"]), s("SIEM", ["splunk", "qradar"], ["Incident Response"]),
  s("Wireshark", [], ["Network Security"]), s("Nmap", [], ["Network Security"]), s("Burp Suite", ["burpsuite"], ["OWASP"]),
  s("OWASP", ["owasp top 10"], ["Penetration Testing"]), s("Penetration Testing", ["pentesting", "pen testing"], ["OWASP", "Kali Linux"]),
  s("Incident Response", [], ["SIEM"]), s("Vulnerability Assessment", ["vulnerability scanning", "nessus"], ["Penetration Testing"]),
  s("Cryptography", [], ["Network Security"]), s("Kali Linux", ["kali"], ["Linux", "Penetration Testing"]),
];

const escapeRe = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const matchers = SKILLS.map((def) => ({
  def,
  re: new RegExp(`(?<![a-z0-9+#.])(?:${def.aliases.map(escapeRe).join("|")})(?![a-z0-9+#])`, "gi"),
}));

/** Returns each skill found with how many times it appears. */
export function skillCounts(text: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const { def, re } of matchers) {
    re.lastIndex = 0;
    const n = text.match(re)?.length ?? 0;
    if (n > 0) out.set(def.name, n);
  }
  return out;
}

export const extractSkills = (text: string) => [...skillCounts(text).keys()];
export const skillDef = (name: string) => SKILLS.find((d) => d.name === name);

const ROLE_PROFILES: { match: RegExp; skills: string[] }[] = [
  { match: /cyber|security|soc analyst|pentest/i, skills: ["Network Security", "Linux", "SIEM", "Incident Response", "Vulnerability Assessment", "OWASP", "Python", "Wireshark"] },
  { match: /data (analyst|scientist)|analytics|business analyst/i, skills: ["SQL", "Python", "Excel", "Pandas", "Power BI", "Tableau", "Statistics", "Data Visualization"] },
  { match: /product (manager|owner)/i, skills: ["Roadmapping", "User Research", "A/B Testing", "Agile", "Jira", "SQL", "Figma"] },
  { match: /marketing/i, skills: ["SEO", "Google Analytics", "Content Marketing", "Email Marketing", "Social Media", "A/B Testing", "Excel"] },
  { match: /software|developer|engineer|full.?stack|front.?end|back.?end|web/i, skills: ["Python", "JavaScript", "React", "Node.js", "SQL", "Git", "REST API", "Data Structures", "Docker", "Testing"] },
];

export const roleSkills = (role: string): string[] => ROLE_PROFILES.find((p) => p.match.test(role))?.skills ?? [];
