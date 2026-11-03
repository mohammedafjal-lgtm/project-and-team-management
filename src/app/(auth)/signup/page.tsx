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
import { signupSchema, type SignupInput } from '@/lib/schemas/auth';

type FieldErrors = Partial<Record<keyof SignupInput, string>>;

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  function validate(): SignupInput | null {
    const result = signupSchema.safeParse({ name, email, password });
    if (result.success) {
      setErrors({});
      return result.data;
    }
    const next: FieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (key === 'name' || key === 'email' || key === 'password') {
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
        void authClient.signUp
          .email(data)
          .then(({ error }) => {
            if (error) {
              toast.error(error.message ?? 'Sign-up failed');
              return;
            }
            router.push('/onboarding');
            router.refresh();
          })
          .catch((err: unknown) => {
            toast.error(err instanceof Error ? err.message : 'Sign-up failed');
          })
          .finally(() => { setPending(false); });
      }}
    >
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-muted-foreground text-sm">
          Then set up your workspace. Takes 30 seconds.
        </p>
      </div>

      <FormField label="Name" htmlFor="name" error={errors.name}>
        <Input
          id="name"
          autoComplete="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
          }}
          placeholder="Your name"
          aria-invalid={!!errors.name}
          autoFocus
        />
      </FormField>

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
        />
      </FormField>

      <FormField
        label="Password"
        htmlFor="password"
        error={errors.password}
        hint="At least 8 characters."
      >
        <PasswordInput
          id="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((x) => ({ ...x, password: undefined }));
          }}
          placeholder="Choose a password"
          aria-invalid={!!errors.password}
        />
      </FormField>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Spinner /> Creating account…
          </>
        ) : (
          'Create account'
        )}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-foreground font-medium underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}