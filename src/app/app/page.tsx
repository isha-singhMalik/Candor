"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { InterviewRecord, Profile } from "@/types";
import { KEYS, usePersisted } from "@/lib/storage/local";
import { ReportView } from "@/components/ReportView";
import { Notice, Skeleton, btnPrimary, btnSecondary } from "@/components/ui";

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [history, , ready] = usePersisted<InterviewRecord[]>(KEYS.history, []);
  const [profile] = usePersisted<Profile | null>(KEYS.profile, null);
  if (!ready) return <Skeleton className="h-96 w-full" />;
  const rec = history.find((h) => h.id === id);
  if (!rec || !rec.report) {
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-3xl font-bold">Report not found</h1>
        <Notice>This report is not in this browser. Reports are stored locally, so they are only available on the device where you took the interview.</Notice>
        <Link href="/app" className={btnPrimary}>Back to dashboard</Link>
      </div>
    );
  }
  return (
    <>
      <ReportView rec={rec} name={profile?.name} />
      <div className="no-print mt-10 flex flex-wrap gap-3 border-t border-line pt-6">
        <Link href="/app/interview" className={btnPrimary}>Take another interview</Link>
        <Link href="/app" className={btnSecondary}>Dashboard</Link>
        <button className={btnSecondary} onClick={() => window.print()}>Print or save as PDF</button>
      </div>
    </>
  );
}
