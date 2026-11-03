'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from './query-keys';
import type { MembershipRole } from '@/models/membership.model';

export interface Membership {
  userId: string;
  tenantId: string;
  role: MembershipRole;
}

export function useMembership(tenantId: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.membership(tenantId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<Membership>('/membership');
      return data;
    },
    enabled: !!tenantId,
  });

  // Default to false while loading — safer to hide the form briefly than to
  // render it and let a viewer submit into a 403 toast.
  const canWrite = query.data ? query.data.role !== 'viewer' : false;

  return { ...query, canWrite };
}