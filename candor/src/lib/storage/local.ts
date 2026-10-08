"use client";
import { useCallback, useEffect, useState } from "react";

/** Browser-local persistence used by the MVP (no account, no server database). Swap for the API + Prisma in Phase 4. */
export function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch { /* corrupted or unavailable storage: start fresh */ }
    setReady(true);
  }, [key]);

  const update = useCallback((next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage full or blocked */ }
      return v;
    });
  }, [key]);

  return [value, update, ready] as const;
}

export const KEYS = {
  profile: "candor.profile.v1",
  resume: "candor.resume.v1",
  history: "candor.history.v1",
} as const;

export function clearAllCandorData() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error("Network problem. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong. Please try again.");
  return data as T;
}
