'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';
import { refreshSession, useSession } from '@/lib/auth-client';
import { z } from 'zod';

const onboardingSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(120, 'Too long'),
  slug: z
    .string()
    .min(2, 'At least 2 characters')
    .max(60, 'At most 60 characters')
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and dashes only'),
});

type FieldErrors = Partial<Record<'name' | 'slug', string>>;

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  const navigatingRef = useRef(false);

  useEffect(() => {
    if (isPending) return;
    if (navigatingRef.current) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    const activeTenantId = (session.user as { activeTenantId?: string }).activeTenantId;
    if (activeTenantId) router.replace('/projects');
  }, [session, isPending, router]);

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create your workspace</h1>
        <p className="text-muted-foreground text-sm">
          You can invite teammates once it exists.
        </p>
      </div>

      <form
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const result = onboardingSchema.safeParse({ name, slug });
          if (!result.success) {
            const next: FieldErrors = {};
            for (const issue of result.error.issues) {
              const key = issue.path[0];
              if (key === 'name' || key === 'slug') next[key] ??= issue.message;
            }
            setErrors(next);
            return;
          }
          setErrors({});
          setPending(true);
          void api
            .post('/tenants', result.data)
            .then(async () => {
              await refreshSession();
              navigatingRef.current = true;
              toast.success('Workspace created');
              router.refresh();
              router.push('/projects');
            })
            .catch((err: unknown) => {
              toast.error(err instanceof Error ? err.message : 'Failed to create workspace');
            })
            .finally(() => { setPending(false); });
        }}
      >
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            Workspace name
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
            }}
            placeholder="Acme Inc."
            maxLength={120}
            aria-invalid={!!errors.name}
            autoFocus
          />
          <FieldError error={errors.name} />
        </div>

        <div className="space-y-1">
          <label htmlFor="slug" className="text-sm font-medium">
            Workspace URL
          </label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
              if (errors.slug) setErrors((x) => ({ ...x, slug: undefined }));
            }}
            placeholder="acme"
            aria-invalid={!!errors.slug}
            aria-describedby="slug-hint"
          />
          <p id="slug-hint" className="text-muted-foreground text-xs">
            Lowercase letters, numbers, and dashes.
          </p>
          <FieldError error={errors.slug} />
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? (
            <>
              <Spinner /> Creating…
            </>
          ) : (
            'Create workspace'
          )}
        </Button>
      </form>
    </main>
  );
}