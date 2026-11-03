'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { queryKeys } from './query-keys';

export interface TimeEntry {
  _id: string;
  projectId: string;
  description: string;
  startedAt: string;
  endedAt?: string;
  billable: boolean;
  workDate: string;
  workTimezone: string;
}

export function useTimeEntries(tenantId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.timeEntries(tenantId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<TimeEntry[]>('/time-entries');
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useCreateTimeEntry(tenantId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      projectId: string;
      description?: string;
      startedAt: string;
      endedAt?: string;
      billable?: boolean;
      workDate: string;
      workTimezone: string;
    }) => {
      const { data } = await api.post<TimeEntry>('/time-entries', input);
      return data;
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.timeEntries(tenantId) });
    },
    onSuccess: () => {
      toast.success('Time entry logged');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}