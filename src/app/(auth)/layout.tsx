import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    const activeTenantId = (session.user as { activeTenantId?: string }).activeTenantId;
    redirect(activeTenantId ? '/projects' : '/onboarding');
  }

  return (
    <main className="bg-muted/30 relative flex min-h-screen items-center justify-center p-6">
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-sm font-semibold"
      >
        <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md text-xs">
          PT
        </span>
        <span>Project &amp; Team</span>
      </Link>
      <div className="bg-background w-full max-w-sm rounded-xl border p-6 shadow-sm">
        {children}
      </div>
    </main>
  );
}