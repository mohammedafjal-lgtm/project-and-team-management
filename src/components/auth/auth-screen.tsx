import Link from "next/link";

export function AuthScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="flex justify-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 font-semibold tracking-tight text-foreground"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm">
            P
          </span>
          <span>PTM</span>
        </Link>
      </div>

      {children}

      <p className="text-center text-xs text-muted-foreground">
        By continuing you agree to our Terms and Privacy Policy.
      </p>
    </div>
  );
}
