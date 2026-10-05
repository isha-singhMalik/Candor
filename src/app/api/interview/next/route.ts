import { handleJson } from "@/lib/api";
import { getAIProvider } from "@/lib/ai";
import { NextSchema } from "@/lib/validation";
import { totalQuestions } from "@/lib/interview/questions";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return handleJson(req, "interview.next", NextSchema, async (d) => {
    const question = await getAIProvider().generateInterviewQuestion(d);
    return { question, total: totalQuestions(d.config.minutes) };
  });
}
