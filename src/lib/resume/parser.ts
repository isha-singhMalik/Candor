export type ResumeKind = "pdf" | "docx";
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const MAX_RESUME_CHARS = 30_000;

export class ResumeError extends Error {}

/** Validate type by content (magic bytes), not by file name or client-supplied MIME. */
export function detectKind(buf: Uint8Array): ResumeKind | null {
  if (buf.length > 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "pdf"; // %PDF
  if (buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) return "docx"; // PK zip
  return null;
}

export async function parseResume(buf: Uint8Array): Promise<string> {
  if (buf.length === 0) throw new ResumeError("The file is empty.");
  if (buf.length > MAX_RESUME_BYTES) throw new ResumeError("The file is larger than 5 MB. Export a smaller PDF or DOCX.");
  const kind = detectKind(buf);
  if (!kind) throw new ResumeError("Only PDF and DOCX resumes are supported.");

  let text = "";
  try {
    if (kind === "pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const res = await extractText(pdf, { mergePages: true });
      text = Array.isArray(res.text) ? res.text.join("\n") : res.text;
    } else {
      const mammoth = await import("mammoth");
      text = (await mammoth.extractRawText({ buffer: Buffer.from(buf) })).value;
    }
  } catch {
    throw new ResumeError("We could not read that file. It may be corrupted or password protected.");
  }
  text = text.replace(/\u0000/g, "").trim();
  if (text.length < 50) throw new ResumeError("No readable text found. Scanned or image-only resumes cannot be analysed; export a text-based PDF or DOCX.");
  return text.slice(0, MAX_RESUME_CHARS);
}
