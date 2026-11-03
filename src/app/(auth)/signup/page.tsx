'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name || !email || !password) return;
        setPending(true);
        void authClient.signUp
          .email({ name, email, password })
          .then(({ error }) => {
            if (error) {
              toast.error(error.message ?? 'Sign-up failed');
              return;
            }
            // Fresh user has no activeTenantId — head straight to onboarding.
            router.push('/onboarding');
          })
          .catch((err: unknown) => {
            toast.error(err instanceof Error ? err.message : 'Sign-up failed');
          })
          .finally(() => {
            setPending(false);
          });
      }}
    >
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="text-muted-foreground text-sm">Then set up your workspace.</p>
      </div>

      <Input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
        }}
        placeholder="Your name"
        autoComplete="name"
        required
      />
      <Input
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
        }}
        placeholder="you@company.com"
        required
      />
      <Input
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
        }}
        placeholder="Password (min 8 chars)"
        minLength={8}
        required
      />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{' '}
        <Link href="/login" className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
