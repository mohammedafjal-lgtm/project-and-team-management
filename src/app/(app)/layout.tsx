import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CommandPalette } from '@/components/command-palette';
import { getAuth } from '@/lib/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect('/login');
  }

  const activeTenantId = (session.user as { activeTenantId?: string }).activeTenantId;
  if (!activeTenantId) {
    redirect('/onboarding');
  }

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <nav className="mx-auto flex max-w-3xl items-center gap-6 px-6 py-3 text-sm">
          <Link href="/projects" className="font-medium hover:underline">
            Projects
          </Link>
          <Link href="/time" className="font-medium hover:underline">
            Time
          </Link>
          <Link href="/invoices" className="font-medium hover:underline">
            Invoices
          </Link>
          <div className="ml-auto">
            <CommandPalette />
          </div>
        </nav>
      </header>
      {children}
    </div>
  );
}