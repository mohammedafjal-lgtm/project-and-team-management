import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center text-center px-4">
      <div>
        <p className="text-sm text-neutral-500">404</p>
        <h1 className="text-2xl font-semibold mt-1">Not found</h1>
        <p className="text-sm text-neutral-500 mt-2">This page or workspace does not exist.</p>
        <Link href="/login" className="inline-block mt-6 underline underline-offset-4 text-sm">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}