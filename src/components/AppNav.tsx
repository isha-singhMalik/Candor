"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

const LINKS = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/resume", label: "Resume" },
  { href: "/app/interview", label: "Interview" },
  { href: "/app/onboarding", label: "Profile" },
];

export function AppNav() {
  const path = usePathname();
  return (
    <nav aria-label="App" className="flex items-center gap-1 text-sm font-semibold">
      {LINKS.map((l) => {
        const active = l.href === "/app" ? path === "/app" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}
            className={cx("rounded-md px-3 py-2", active ? "bg-ink text-white" : "text-ink hover:bg-signal-soft")}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
