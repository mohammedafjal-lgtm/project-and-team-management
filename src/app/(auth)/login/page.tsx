'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Spinner } from '@/components/ui/spinner';
import { authClient } from '@/lib/auth-client';
import { getQueryClient } from '@/lib/query-client';
import { loginSchema, type LoginInput } from '@/lib/schemas/auth';

type FieldErrors = Partial<Record<keyof LoginInput, string>>;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  function validate(): LoginInput | null {
    const result = loginSchema.safeParse({ email, password });
    if (result.success) {
      setErrors({});
      return result.data;
    }
    const next: FieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (key === 'email' || key === 'password') {
        next[key] ??= issue.message;
      }
    }
    setErrors(next);
    return null;
  }

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const data = validate();
        if (!data) return;
        setPending(true);
        void authClient.signIn
          .email(data)
          .then(({ error }) => {
            if (error) {
              toast.error(error.message ?? 'Sign-in failed');
              return;
            }
            getQueryClient().clear();
            router.push('/projects');
            router.refresh();
          })
          .catch((err: unknown) => {
            toast.error(err instanceof Error ? err.message : 'Sign-in failed');
          })
          .finally(() => { setPending(false); });
      }}
    >
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground text-sm">
          Welcome back. Enter your details to continue.
        </p>
      </div>

      <FormField label="Email" htmlFor="email" error={errors.email}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((x) => ({ ...x, email: undefined }));
          }}
          placeholder="you@company.com"
          aria-invalid={!!errors.email}
          autoFocus
        />
      </FormField>

      <FormField label="Password" htmlFor="password" error={errors.password}>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((x) => ({ ...x, password: undefined }));
          }}
          placeholder="Your password"
          aria-invalid={!!errors.password}
        />
      </FormField>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Spinner /> Signing in…
          </>
        ) : (
          'Sign in'
        )}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        No account?{' '}
        <Link
          href="/signup"
          className="text-foreground font-medium underline underline-offset-4"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}