import { createHash } from "node:crypto";

/** Structured audit log. Never log resume text, answers or other content, only metadata. */
export function audit(event: string, req: Request, extra: Record<string, string | number | boolean> = {}) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const actor = createHash("sha256").update(ip).digest("hex").slice(0, 12);
  console.log(JSON.stringify({ t: new Date().toISOString(), event, actor, ...extra }));
}
