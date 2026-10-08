"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-xl px-6 py-24">
      <h1 className="text-3xl font-bold">Something broke on this page</h1>
      <p className="mt-3 text-muted">Your saved data is safe. Try again, and if it keeps happening, reload the page.</p>
      <button onClick={reset} className="mt-6 rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-signal">Try again</button>
    </main>
  );
}
