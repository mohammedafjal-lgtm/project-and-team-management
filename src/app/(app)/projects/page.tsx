'use client';

import { FolderKanban } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FieldError } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useActiveTenant } from '@/hooks/use-active-tenant';
import { useMembership } from '@/hooks/use-membership';
import { useCreateProject, useProjects } from '@/hooks/use-projects';

export default function ProjectsPage() {
  const { activeTenantId } = useActiveTenant();
  const { canWrite } = useMembership(activeTenantId);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const { data: projects, isLoading, isError, error: queryError } = useProjects(activeTenantId);
  const createProject = useCreateProject(activeTenantId ?? '');

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-muted-foreground text-sm">
          Group time entries and invoices under shared work.
        </p>
      </header>

      {canWrite && (
        <form
          className="space-y-1.5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = name.trim();
            if (!trimmed) {
              setError('Project name is required');
              return;
            }
            if (trimmed.length > 120) {
              setError('Project name must be 120 characters or fewer');
              return;
            }
            createProject.mutate(
              { name: trimmed },
              {
                onSuccess: () => {
                  setName('');
                  setError(undefined);
                },
              },
            );
          }}
        >
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(undefined);
                }}
                placeholder="New project name"
                aria-invalid={!!error}
                maxLength={120}
              />
            </div>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? (
                <>
                  <Spinner /> Creating…
                </>
              ) : (
                'Create'
              )}
            </Button>
          </div>
          <FieldError error={error} />
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={FolderKanban}
          title="Couldn't load projects"
          description={queryError instanceof Error ? queryError.message : 'Try again in a moment.'}
        />
      ) : projects && projects.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {projects.map((p) => (
            <li key={p._id} className="flex items-center justify-between gap-4 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="text-muted-foreground text-xs">
                  Created {new Date(p.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={p.status === 'active' ? 'success' : 'muted'}>
                {p.status}
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description={
            canWrite
              ? 'Create your first project using the form above.'
              : 'Ask a workspace admin to create one.'
          }
        />
      )}
    </main>
  );
}