import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CommandPalette } from '@/components/command-palette';
import { TenantSwitcher } from '@/components/tenant-switcher';
import { UserMenu } from '@/components/user-menu';
import { getAuth } from '@/lib/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect('/login');

  const activeTenantId = (session.user as { activeTenantId?: string }).activeTenantId;
  if (!activeTenantId) redirect('/onboarding');

  return (
    <div className="min-h-screen">
      <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
          <TenantSwitcher />
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/projects"
              className="hover:bg-muted rounded-md px-2.5 py-1.5 font-medium"
            >
              Projects
            </Link>
            <Link
              href="/time"
              className="hover:bg-muted rounded-md px-2.5 py-1.5 font-medium"
            >
              Time
            </Link>
            <Link
              href="/invoices"
              className="hover:bg-muted rounded-md px-2.5 py-1.5 font-medium"
            >
              Invoices
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <CommandPalette />
            <UserMenu />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}