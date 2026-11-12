"use client";

import { ProjectRole } from "@prisma/client";

export type TeamMemberOption = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

export type ProjectMemberSelection = {
  userId: string;
  role: ProjectRole;
};

export function ProjectMembersPicker({
  team,
  value,
  onChange,
}: {
  team: TeamMemberOption[];
  value: ProjectMemberSelection[];
  onChange: (next: ProjectMemberSelection[]) => void;
}) {
  const selected = new Map(value.map((m) => [m.userId, m.role]));

  function toggle(userId: string) {
    if (selected.has(userId)) {
      onChange(value.filter((m) => m.userId !== userId));
      return;
    }
    onChange([...value, { userId, role: ProjectRole.MEMBER }]);
  }

  function setRole(userId: string, role: ProjectRole) {
    onChange(value.map((m) => (m.userId === userId ? { ...m, role } : m)));
  }

  const assignable = team.filter((m) => m.role !== "CLIENT");

  return (
    <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-auto">
      {assignable.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted-foreground">No team members available.</p>
      ) : (
        assignable.map((m) => {
          const checked = selected.has(m.id);
          return (
            <div key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(m.id)}
                className="rounded border-input"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{m.name ?? m.email}</p>
                <p className="text-xs text-muted-foreground truncate">{m.email}</p>
              </div>
              {checked ? (
                <select
                  value={selected.get(m.id)}
                  onChange={(e) => setRole(m.id, e.target.value as ProjectRole)}
                  className="h-8 rounded-md border border-border bg-card px-2 text-xs"
                >
                  <option value={ProjectRole.ADMIN}>Admin</option>
                  <option value={ProjectRole.MEMBER}>Member</option>
                </select>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
