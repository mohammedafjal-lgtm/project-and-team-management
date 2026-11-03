'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useActiveTenant } from '@/hooks/use-active-tenant';
import { useMembership } from '@/hooks/use-membership';
import { useProjects } from '@/hooks/use-projects';
import { useCreateTimeEntry, useTimeEntries } from '@/hooks/use-time-entries';

export default function TimePage() {
  const { activeTenantId } = useActiveTenant();
  const { canWrite } = useMembership(activeTenantId);
  const { data: entries, isLoading } = useTimeEntries(activeTenantId);
  const { data: projects } = useProjects(activeTenantId);
  const createEntry = useCreateTimeEntry(activeTenantId ?? '');

  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState('');

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Time entries</h1>

      {canWrite && (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            const h = Number(hours);
            if (!projectId || !Number.isFinite(h) || h <= 0) return;

            const start = new Date();
            const end = new Date(start.getTime() + h * 3600_000);
            createEntry.mutate(
              {
                projectId,
                description,
                startedAt: start.toISOString(),
                endedAt: end.toISOString(),
                billable: true,
                workDate: start.toISOString().slice(0, 10),
                workTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
              {
                onSuccess: () => {
                  setDescription('');
                  setHours('');
                },
              },
            );
          }}
        >
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
            }}
            className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
          >
            <option value="">Select project…</option>
            {projects?.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
          <Input
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
            placeholder="Description"
          />
          <Input
            value={hours}
            onChange={(e) => {
              setHours(e.target.value);
            }}
            placeholder="Hours (e.g. 1.5)"
            inputMode="decimal"
            className="w-32"
          />
          <Button type="submit" disabled={createEntry.isPending}>
            {createEntry.isPending ? 'Saving…' : 'Log'}
          </Button>
        </form>
      )}

      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {entries?.map((e) => (
            <li key={e._id} className="flex items-center justify-between p-3">
              <div>
                <div className="text-sm">{e.description || '(no description)'}</div>
                <div className="text-muted-foreground text-xs">
                  {e.workDate} · {e.workTimezone}
                </div>
              </div>
              <span className="text-muted-foreground text-xs">
                {e.billable ? 'Billable' : 'Non-billable'}
              </span>
            </li>
          ))}
          {entries?.length === 0 && (
            <li className="text-muted-foreground p-3 text-sm">No entries yet.</li>
          )}
        </ul>
      )}
    </main>
  );
}
