import { getTenantContext } from "@/lib/tenancy/resolve";
import { listTimeEntries } from "@/domains/time/time.repo";
import { listProjects } from "@/domains/projects/project.repo";
import { TimeList } from "@/components/time/time-list";
import { hasRole } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";

export default async function TimePage() {
  const ctx = await getTenantContext();
  const [entries, projects] = await Promise.all([
    listTimeEntries(ctx),
    listProjects(ctx),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Time</h1>
        <p className="text-sm text-neutral-500 mt-1">{entries.length} entries</p>
      </div>
      <TimeList
        canApprove={hasRole(ctx.role, Role.MANAGER)}
        initialEntries={entries.map((e) => ({
          id: e.id,
          date: e.date.toISOString(),
          durationMinutes: e.durationMinutes,
          billable: e.billable,
          status: e.status,
          projectName: e.project.name,
          userName: e.user.name ?? e.user.email,
          notes: e.notes,
        }))}
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          clientName: p.client.name,
          defaultRateCents: p.client.defaultRateCents,
        }))}
      />
    </div>
  );
}
