'use client';

import { Clock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FieldError } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useActiveTenant } from '@/hooks/use-active-tenant';
import { useMembership } from '@/hooks/use-membership';
import { useProjects } from '@/hooks/use-projects';
import { useCreateTimeEntry, useTimeEntries } from '@/hooks/use-time-entries';

interface FormErrors {
  projectId?: string;
  hours?: string;
  description?: string;
}

function formatDuration(startedAt: string, endedAt?: string): string {
  if (!endedAt) return '—';
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  const hours = ms / 3_600_000;
  return `${hours.toFixed(2)}h`;
}

export default function TimePage() {
  const { activeTenantId } = useActiveTenant();
  const { canWrite } = useMembership(activeTenantId);
  const { data: entries, isLoading } = useTimeEntries(activeTenantId);
  const { data: projects } = useProjects(activeTenantId);
  const createEntry = useCreateTimeEntry(activeTenantId ?? '');

  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects ?? []) map.set(p._id, p.name);
    return map;
  }, [projects]);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Time entries</h1>
        <p className="text-muted-foreground text-sm">
          Log work against projects. Hours are converted to start/end timestamps.
        </p>
      </header>

      {canWrite && (
        <form
          className="space-y-2 rounded-lg border p-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const nextErrors: FormErrors = {};
            if (!projectId) nextErrors.projectId = 'Select a project';
            const h = Number(hours);
            if (!hours.trim()) nextErrors.hours = 'Hours required';
            else if (!Number.isFinite(h) || h <= 0) nextErrors.hours = 'Must be > 0';
            else if (h > 24) nextErrors.hours = 'Max 24 hours per entry';
            if (description.length > 500)
              nextErrors.description = 'Description must be 500 chars or fewer';

            if (Object.keys(nextErrors).length > 0) {
              setErrors(nextErrors);
              return;
            }

            const start = new Date();
            const end = new Date(start.getTime() + h * 3_600_000);
            createEntry.mutate(
              {
                projectId,
                description: description.trim(),
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
                  setErrors({});
                },
              },
            );
          }}
        >
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_7rem_auto]">
            <div className="space-y-1">
              <Select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  if (errors.projectId) setErrors((x) => ({ ...x, projectId: undefined }));
                }}
                aria-invalid={!!errors.projectId}
              >
                <option value="">Select project…</option>
                {projects?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <FieldError error={errors.projectId} />
            </div>

            <div className="space-y-1">
              <Input
                value={hours}
                onChange={(e) => {
                  setHours(e.target.value);
                  if (errors.hours) setErrors((x) => ({ ...x, hours: undefined }));
                }}
                placeholder="Hours"
                inputMode="decimal"
                aria-invalid={!!errors.hours}
              />
              <FieldError error={errors.hours} />
            </div>

            <div className="space-y-1 sm:col-span-1">
              <Input
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description)
                    setErrors((x) => ({ ...x, description: undefined }));
                }}
                placeholder="Description"
                maxLength={500}
                aria-invalid={!!errors.description}
              />
              <FieldError error={errors.description} />
            </div>

            <Button
              type="submit"
              disabled={createEntry.isPending}
              className="sm:self-start"
            >
              {createEntry.isPending ? (
                <>
                  <Spinner /> Saving
                </>
              ) : (
                'Log'
              )}
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : entries && entries.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {entries.map((e) => (
            <li
              key={e._id}
              className="flex items-center justify-between gap-4 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {e.description || '(no description)'}
                </p>
                <p className="text-muted-foreground text-xs">
                  {projectNameById.get(e.projectId) ?? 'Unknown project'} ·{' '}
                  {e.workDate} · {formatDuration(e.startedAt, e.endedAt)}
                </p>
              </div>
              <Badge variant={e.billable ? 'success' : 'muted'}>
                {e.billable ? 'Billable' : 'Non-billable'}
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Clock}
          title="No time logged yet"
          description={
            canWrite
              ? 'Log your first entry using the form above.'
              : 'Entries logged by your team will appear here.'
          }
        />
      )}
    </main>
  );
}