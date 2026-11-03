'use client';

import { useState } from 'react';
import { CommandPalette } from '@/components/command-palette';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateProject, useProjects } from '@/hooks/use-projects';

const TENANT_ID = 'demo-tenant';

export default function ProjectsPage() {
  const [name, setName] = useState('');
  const { data: projects, isLoading } = useProjects(TENANT_ID);
  const createProject = useCreateProject(TENANT_ID);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <CommandPalette />
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          createProject.mutate(
            { name: name.trim() },
            { onSuccess: () => { setName(''); } },
          );
        }}
      >
        <Input
          value={name}
          onChange={(e) => { setName(e.target.value); }}
          placeholder="New project name"
        />
        <Button type="submit" disabled={createProject.isPending}>
          {createProject.isPending ? 'Creating...' : 'Create'}
        </Button>
      </form>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {projects?.map((p) => (
            <li key={p._id} className="flex items-center justify-between p-3">
              <span>{p.name}</span>
              <span className="text-xs text-muted-foreground">{p.status}</span>
            </li>
          ))}
          {projects?.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">No projects yet.</li>
          )}
        </ul>
      )}
    </main>
  );
}