import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { money } from "@/lib/money";
import { formatDate } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const ctx = await getTenantContext();

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
    include: { client: true },
  });
  if (!project) notFound();

  const [minutesAgg, tasksTotal, tasksDone, invoiceTotal] = await Promise.all([
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
  ]);

  const minutes = minutesAgg._sum.durationMinutes ?? 0;
  const hours = minutes / 60;

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider">{project.client.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          {project.code ? (
            <p className="text-sm text-neutral-500 mt-1 font-mono">{project.code}</p>
          ) : null}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 bg-white dark:bg-neutral-950">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Status</p>
          <p className="mt-2"><Badge variant="outline">{project.status}</Badge></p>
        </div>
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 bg-white dark:bg-neutral-950">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Time logged</p>
          <p className="mt-2 text-lg font-semibold tabular-nums">{hours.toFixed(2)} h</p>
        </div>
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 bg-white dark:bg-neutral-950">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Tasks</p>
          <p className="mt-2 text-lg font-semibold tabular-nums">
            {tasksDone}/{tasksTotal}
          </p>
        </div>
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 bg-white dark:bg-neutral-950">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Client invoiced</p>
          <p className="mt-2 text-lg font-semibold tabular-nums">
            {money(invoiceTotal._sum.amountCents ?? 0, project.client.currency)}
          </p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Budget</h2>
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 text-sm bg-white dark:bg-neutral-950">
          {project.budgetType === "HOURS" && project.budgetMinutes ? (
            <>
              <p className="tabular-nums">
                {hours.toFixed(2)} h of {((project.budgetMinutes ?? 0) / 60).toFixed(2)} h used
              </p>
              <div className="mt-2 h-2 rounded bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                <div
                  className="h-full bg-neutral-900 dark:bg-neutral-100"
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
            <p className="text-neutral-500">No budget set.</p>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Details</h2>
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 text-sm bg-white dark:bg-neutral-950 space-y-1">
          <p><span className="text-neutral-500">Client:</span>{" "}
            <Link href={`/clients/${project.client.id}`} className="hover:underline">
              {project.client.name}
            </Link>
          </p>
          <p><span className="text-neutral-500">Created:</span> {formatDate(project.createdAt)}</p>
          {project.startDate ? (
            <p><span className="text-neutral-500">Start:</span> {formatDate(project.startDate)}</p>
          ) : null}
          {project.endDate ? (
            <p><span className="text-neutral-500">End:</span> {formatDate(project.endDate)}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}