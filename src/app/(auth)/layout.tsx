export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-muted/30 flex min-h-screen items-center justify-center p-6">
      <div className="bg-background w-full max-w-sm rounded-xl border p-6 shadow-sm">
        {children}
      </div>
    </main>
  );
}
