import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
      <header className="p-6">
        <Link href="/" className="font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          PTM
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4">{children}</main>
      <footer className="p-6 text-xs text-neutral-500">
        By continuing you agree to our Terms and Privacy Policy.
      </footer>
    </div>
  );
}