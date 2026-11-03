'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api-client';
import { refreshSession, useSession } from '@/lib/auth-client';

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [pending, setPending] = useState(false);

  // Skip the "already onboarded" guard after a successful create — the
  // redirect that follows is the intended one, not a bounce-back.
  const navigatingRef = useRef(false);

  useEffect(() => {
    if (isPending) return;
    if (navigatingRef.current) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    const activeTenantId = (session.user as { activeTenantId?: string }).activeTenantId;
    if (activeTenantId) {
      router.replace('/projects');
    }
  }, [session, isPending, router]);

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Create your workspace</h1>
        <p className="text-sm text-muted-foreground">
          You can invite teammates once it exists.
        </p>
      </div>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !slug.trim()) return;
          setPending(true);
          void api
            .post('/tenants', { name: name.trim(), slug: slug.trim() })
            .then(async () => {
              // POST /api/tenants updated the user row server-side. Pull the
              // fresh session into the client store BEFORE navigating, so
              // useSession() on /projects sees activeTenantId immediately.
              await refreshSession();
              navigatingRef.current = true;
              toast.success('Workspace created');
              router.refresh();
              router.push('/projects');
            })
            .catch((err: unknown) => {
              toast.error(err instanceof Error ? err.message : 'Failed');
            })
            .finally(() => {
              setPending(false);
            });
        }}
      >
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          placeholder="Workspace name"
          required
        />
        <Input
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
          }}
          placeholder="slug (a-z, 0-9, dashes)"
          pattern="^[a-z0-9-]{2,60}$"
          required
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Creating…' : 'Create workspace'}
        </Button>
      </form>
    </main>
  );
}