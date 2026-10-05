import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  const p = getAIProvider();
  return NextResponse.json({ ok: true, mode: p.mode, provider: p.name });
}
