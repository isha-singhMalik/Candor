import { handleJson } from "@/lib/api";
import { getAIProvider } from "@/lib/ai";
import { PlanSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  return handleJson(req, "plan", PlanSchema, async (d) => ({
    plan: await getAIProvider().generatePracticePlan({ ...d, weakAreas: d.weakAreas }),
  }));
}
