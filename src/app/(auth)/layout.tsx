export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background px-4 py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(0.85_0.06_190/0.45),transparent),radial-gradient(ellipse_50%_40%_at_100%_100%,oklch(0.9_0.04_210/0.35),transparent)]"
      />
      <div className="relative z-10 w-full flex justify-center">{children}</div>
    </div>
  );
}
