import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { rateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/lib/security/audit";

const MAX_BODY = 400_000;

export const fail = (message: string, status: number, headers?: Record<string, string>) =>
  NextResponse.json({ error: message }, { status, headers });

/** Shared pipeline: rate limit, size cap, JSON parse, schema validation, error masking, audit log. */
export async function handleJson<T>(req: Request, name: string, schema: ZodType<T>, fn: (data: T) => Promise<unknown>, limitPerMin = 40) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rl = rateLimit(`${name}:${ip}`, limitPerMin, 60_000);
  if (!rl.ok) return fail("Too many requests. Wait a moment and try again.", 429, { "retry-after": String(rl.retryAfter) });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return fail("That request is too large.", 413);
  let body: unknown;
  try { body = await req.json(); } catch { return fail("The request was not valid JSON.", 400); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return fail(`Invalid input${first ? `: ${first.path.join(".") || "body"} - ${first.message}` : ""}`, 400);
  }
  try {
    audit(name, req);
    return NextResponse.json(await fn(parsed.data));
  } catch (err) {
    console.error(`[${name}]`, err instanceof Error ? err.message : "unknown error"); // never return internals to the client
    return fail("Something went wrong on our side. Please try again.", 500);
  }
}
