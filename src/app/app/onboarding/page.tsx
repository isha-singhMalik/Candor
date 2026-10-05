"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/types";
import { KEYS, usePersisted } from "@/lib/storage/local";
import { btnPrimary, input, label } from "@/components/ui";

const EMPTY: Profile = { name: "", email: "", education: "", degree: "", college: "", gradYear: "", experience: "fresher", targetRole: "", targetIndustry: "", targetCompanies: "", skills: "", interviewType: "fresher" };

export default function Onboarding() {
  const router = useRouter();
  const [saved, setSaved, ready] = usePersisted<Profile | null>(KEYS.profile, null);
  const [p, setP] = useState<Profile>(EMPTY);
  const [error, setError] = useState("");
  useEffect(() => { if (ready && saved) setP(saved); }, [ready, saved]);
  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setP((s) => ({ ...s, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!p.name.trim() || !p.targetRole.trim()) return setError("Add your name and target role so Candor can tailor questions.");
    if (p.email && !/^\S+@\S+\.\S+$/.test(p.email)) return setError("That email address does not look right.");
    setSaved(p);
    router.push("/app/resume");
  }

  const text = (k: keyof Profile, l: string, extra: { placeholder?: string; type?: string; required?: boolean } = {}) => (
    <div>
      <label htmlFor={k} className={label}>{l}</label>
      <input id={k} value={p[k]} onChange={set(k)} className={input} {...extra} />
    </div>
  );

  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl font-bold">Your profile</h1>
      <p className="mt-2 text-muted">Candor uses this to choose realistic questions for your level and target role. It is saved in this browser only.</p>
      <form onSubmit={submit} className="mt-8 grid gap-5 sm:grid-cols-2" noValidate>
        {text("name", "Name", { required: true })}
        {text("email", "Email (optional)", { type: "email" })}
        {text("education", "Education level", { placeholder: "B.Tech, BBA, MBA…" })}
        {text("degree", "Degree / major", { placeholder: "Computer Science" })}
        {text("college", "College")}
        {text("gradYear", "Graduation year", { placeholder: "2026" })}
        <div>
          <label htmlFor="experience" className={label}>Experience level</label>
          <select id="experience" value={p.experience} onChange={set("experience")} className={input}>
            <option value="fresher">Fresher</option><option value="0-2">0–2 years</option><option value="2-5">2–5 years</option><option value="5+">5+ years</option>
          </select>
        </div>
        {text("targetRole", "Target role", { placeholder: "Software Engineer", required: true })}
        {text("targetIndustry", "Target industry")}
        {text("targetCompanies", "Target companies (optional)")}
        <div className="sm:col-span-2">
          <label htmlFor="skills" className={label}>Skills</label>
          <input id="skills" value={p.skills} onChange={set("skills")} className={input} placeholder="Python, React, SQL, Git" />
        </div>
        <div>
          <label htmlFor="interviewType" className={label}>Preferred interview type</label>
          <select id="interviewType" value={p.interviewType} onChange={set("interviewType")} className={input}>
            <option value="fresher">Fresher mix</option><option value="hr">HR</option><option value="behavioral">Behavioral</option><option value="technical">Technical</option><option value="resume">Resume-based</option>
          </select>
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-bad sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2"><button className={btnPrimary}>Save and add my resume</button></div>
      </form>
    </div>
  );
}
