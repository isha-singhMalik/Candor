import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { getAIProvider } from "@/lib/ai";
import { parseResume, ResumeError, MAX_RESUME_BYTES, MAX_RESUME_CHARS } from "@/lib/resume/parser";
import { ResumeFieldsSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/lib/security/audit";

export const runtime = "nodejs";

/** Accepts multipart (file upload) or JSON ({ text }). Files are parsed in memory and never written to disk. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rl = rateLimit(`resume:${ip}`, 15, 60_000);
  if (!rl.ok) return fail("Too many resume scans. Wait a moment and try again.", 429, { "retry-after": String(rl.retryAfter) });

  try {
    let text = "";
    let fields: Record<string, unknown> = {};
    const type = req.headers.get("content-type") ?? "";

    if (type.includes("multipart/form-data")) {
      if (Number(req.headers.get("content-length") ?? 0) > MAX_RESUME_BYTES + 100_000) return fail("The file is larger than 5 MB.", 413);
      const form = await req.formData();
      const file = form.get("file");
      fields = { role: form.get("role") ?? undefined, experience: form.get("experience") ?? undefined, jdText: form.get("jdText") || undefined };
      if (file instanceof File) {
        if (file.size > MAX_RESUME_BYTES) return fail("The file is larger than 5 MB.", 413);
        text = await parseResume(new Uint8Array(await file.arrayBuffer()));
      } else if (typeof form.get("text") === "string") {
        text = String(form.get("text"));
      }
    } else {
      const body = await req.json();
      text = typeof body.text === "string" ? body.text : "";
      fields = { role: body.role, experience: body.experience, jdText: body.jdText || undefined };
    }

    text = text.trim().slice(0, MAX_RESUME_CHARS);
    if (text.length < 50) return fail("Add your resume text or upload a PDF or DOCX file (at least a few lines).", 400);
    const parsed = ResumeFieldsSchema.safeParse(fields);
    if (!parsed.success) return fail("Check the role, experience level and job description fields.", 400);

    audit("resume.analyze", req, { chars: text.length, hasJd: !!parsed.data.jdText });
    const analysis = await getAIProvider().analyzeResume({ text, ...parsed.data });
    return NextResponse.json({ analysis, text });
  } catch (err) {
    if (err instanceof ResumeError) return fail(err.message, 422);
    console.error("[resume.analyze]", err instanceof Error ? err.message : "unknown");
    return fail("We could not analyse that resume. Try pasting the text instead.", 500);
  }
}
