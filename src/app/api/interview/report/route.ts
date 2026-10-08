import { handleJson } from "@/lib/api";
import { getAIProvider } from "@/lib/ai";
import { ReportSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  return handleJson(req, "interview.report", ReportSchema, async (d) => ({
    report: await getAIProvider().generateInterviewReport(d),
  }));
}
