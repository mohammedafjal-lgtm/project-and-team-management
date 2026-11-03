'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!email || !password) return;
        setPending(true);
        void authClient.signIn
          .email({ email, password })
          .then(({ error }) => {
            if (error) {
              toast.error(error.message ?? 'Sign-in failed');
              return;
            }
            // /projects layout will bounce to /onboarding if needed.
            router.push('/projects');
          })
          .catch((err: unknown) => {
            toast.error(err instanceof Error ? err.message : 'Sign-in failed');
          })
          .finally(() => {
            setPending(false);
          });
      }}
    >
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">Welcome back.</p>
      </div>

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
        autoComplete="current-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
        }}
        placeholder="Password"
        required
      />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        No account?{' '}
        <Link href="/signup" className="underline underline-offset-4">
          Create one
        </Link>
      </p>
    </form>
  );
}