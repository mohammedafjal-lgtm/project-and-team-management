/* eslint-disable @typescript-eslint/no-unnecessary-condition */
'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useSession } from '@/lib/auth-client';

export interface TenantSummary {
  _id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'business';
}

export function useTenants() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ['tenants', userId ?? 'anon'],
    queryFn: async () => {
      const { data } = await api.get<TenantSummary[]>('/tenants');
      return data;
    },
    enabled: !!userId,
  });
}