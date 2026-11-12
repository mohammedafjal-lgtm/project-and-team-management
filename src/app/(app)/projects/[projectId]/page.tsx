import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { money } from "@/lib/money";
import { formatDate } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProject } from "@/domains/projects/project.repo";
import { canManageProjectSettings } from "@/lib/auth/permissions";
import { ProjectSettings } from "@/components/projects/project-settings";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const ctx = await getTenantContext();

  const project = await getProject(ctx, projectId);
  if (!project) notFound();

  const projectRole = project.members.find((m) => m.userId === ctx.userId)?.role ?? null;
  const canManage = canManageProjectSettings(ctx.role, projectRole);

  const [minutesAgg, tasksTotal, tasksDone, invoiceTotal, memberships] = await Promise.all([
    prisma.timeEntry.aggregate({
      where: { tenantId: ctx.tenantId, projectId: project.id },
      _sum: { durationMinutes: true },
    }),
    prisma.task.count({ where: { tenantId: ctx.tenantId, projectId: project.id } }),
    prisma.task.count({ where: { tenantId: ctx.tenantId, projectId: project.id, status: "DONE" } }),
    prisma.invoiceLineItem.aggregate({
      where: {
        tenantId: ctx.tenantId,
        invoice: { clientId: project.clientId, status: { not: "VOID" } },
      },
      _sum: { amountCents: true },
    }),
    canManage
      ? prisma.membership.findMany({
          where: { tenantId: ctx.tenantId, status: "ACTIVE" },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const minutes = minutesAgg._sum.durationMinutes ?? 0;
  const hours = minutes / 60;

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{project.client.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          {project.code ? (
            <p className="text-sm text-muted-foreground mt-1 font-mono">{project.code}</p>
          ) : null}
          <div className="mt-2 flex gap-2">
            <Badge variant="outline">{project.visibility}</Badge>
            <Badge variant="outline">{project.status}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/projects/${project.id}/board`}>Open board</Link>
          </Button>
          <Button asChild>
            <Link href={`/time?project=${project.id}`}>Log time</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</p>
          <p className="mt-2"><StatusBadge status={project.status} /></p>
        </div>
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Time logged</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{hours.toFixed(2)} h</p>
        </div>
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tasks</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {tasksDone}/{tasksTotal}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Client invoiced</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {money(invoiceTotal._sum.amountCents ?? 0, project.client.currency)}
          </p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Budget</h2>
        <div className="border border-border rounded-lg p-4 text-sm bg-card">
          {project.budgetType === "HOURS" && project.budgetMinutes ? (
            <>
              <p className="tabular-nums">
                {hours.toFixed(2)} h of {((project.budgetMinutes ?? 0) / 60).toFixed(2)} h used
              </p>
              <div className="mt-2 h-2 rounded bg-muted overflow-hidden">
                <div
                  className="h-full bg-foreground"
                  style={{ width: `${Math.min(100, (hours * 60 * 100) / project.budgetMinutes)}%` }}
                />
              </div>
            </>
          ) : project.budgetType === "AMOUNT" && project.budgetCents ? (
            <p className="tabular-nums">
              {money(invoiceTotal._sum.amountCents ?? 0, project.client.currency)} of{" "}
              {money(project.budgetCents, project.client.currency)} invoiced
            </p>
          ) : (
            <p className="text-muted-foreground">No budget set.</p>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Details</h2>
        <div className="border border-border rounded-lg p-4 text-sm bg-card space-y-1">
          <p><span className="text-muted-foreground">Client:</span>{" "}
            <Link href={`/clients/${project.client.id}`} className="hover:underline">
              {project.client.name}
            </Link>
          </p>
          <p><span className="text-muted-foreground">Created:</span> {formatDate(project.createdAt)}</p>
          {project.startDate ? (
            <p><span className="text-muted-foreground">Start:</span> {formatDate(project.startDate)}</p>
          ) : null}
          {project.endDate ? (
            <p><span className="text-muted-foreground">End:</span> {formatDate(project.endDate)}</p>
          ) : null}
        </div>
      </section>

      {canManage ? (
        <div className="border border-border rounded-lg p-4 bg-card">
          <ProjectSettings
            projectId={project.id}
            visibility={project.visibility}
            members={project.members.map((m) => ({ userId: m.userId, role: m.role }))}
            team={memberships.map((m) => ({
              id: m.user.id,
              name: m.user.name,
              email: m.user.email,
              role: m.role,
            }))}
          />
        </div>
      ) : (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Members</h2>
          <div className="border border-border rounded-lg divide-y divide-border bg-card">
            {project.members.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">No project members assigned.</p>
            ) : (
              project.members.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{m.user.name ?? m.user.email}</p>
                    <p className="text-xs text-muted-foreground">{m.user.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{m.role}</span>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
