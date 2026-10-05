import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-xl px-6 py-24">
      <h1 className="text-3xl font-bold">That page does not exist</h1>
      <p className="mt-3 text-muted">The link may be old or mistyped.</p>
      <Link href="/" className="mt-6 inline-block font-semibold text-signal underline underline-offset-4">Back to Candor</Link>
    </main>
  );
}
