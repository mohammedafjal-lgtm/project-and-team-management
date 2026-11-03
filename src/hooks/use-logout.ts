'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { getQueryClient } from '@/lib/query-client';

export function useLogout() {
  const router = useRouter();

  return async () => {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error(error.message ?? 'Sign out failed');
      return;
    }
    getQueryClient().clear();
    toast.success('Signed out');
    router.replace('/login');
    router.refresh();
  };
}