import { handleJson } from "@/lib/api";
import { getAIProvider } from "@/lib/ai";
import { EvaluateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return handleJson(req, "interview.evaluate", EvaluateSchema, async (d) => ({
    evaluation: await getAIProvider().evaluateInterviewAnswer(d),
  }));
}
