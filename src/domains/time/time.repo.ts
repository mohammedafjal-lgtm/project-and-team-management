import { TimeEntryStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { TenantContext } from "@/lib/tenancy/context";

export async function listTimeEntries(
  ctx: TenantContext,
  opts?: { userId?: string; projectId?: string; status?: TimeEntryStatus }
) {
  return prisma.timeEntry.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(opts?.userId && { userId: opts.userId }),
      ...(opts?.projectId && { projectId: opts.projectId }),
      ...(opts?.status && { status: opts.status }),
    },
    include: { project: true, user: true, task: true },
    orderBy: { date: "desc" },
  });
}

export async function createTimeEntry(
  ctx: TenantContext,
  input: {
    projectId: string;
    taskId?: string;
    date: Date;
    durationMinutes: number;
    billable: boolean;
    rateCentsSnapshot: number;
    notes?: string;
  }
) {
  return prisma.timeEntry.create({
    data: {
      ...input,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    },
  });
}