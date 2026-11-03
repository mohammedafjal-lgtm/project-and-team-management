'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { queryKeys } from './query-keys';

export interface Project {
  _id: string;
  name: string;
  status: 'active' | 'archived';
  createdAt: string;
}

export function useProjects(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.projects(tenantId),
    queryFn: async () => {
      const { data } = await api.get<Project[]>('/projects');
      return data;
    },
  });
}

export function useCreateProject(tenantId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string }) => {
      const { data } = await api.post<Project>('/projects', input);
      return data;
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.projects(tenantId) });
    },
    onSuccess: () => {
      toast.success('Project created');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}