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
    include: { project: true, user: true, task: true, invoice: { select: { id: true, number: true } } },
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
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found");

  if (input.taskId) {
    const task = await prisma.task.findFirst({
      where: { id: input.taskId, tenantId: ctx.tenantId, projectId: input.projectId },
      select: { id: true },
    });
    if (!task) throw new Error("Task not found on this project");
  }

  return prisma.timeEntry.create({
    data: {
      ...input,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    },
  });
}

export async function updateTimeEntry(
  ctx: TenantContext,
  id: string,
  input: { notes?: string | null; durationMinutes?: number; date?: Date; billable?: boolean }
) {
  const entry = await prisma.timeEntry.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!entry) throw new Error("Time entry not found");
  if (entry.status === "LOCKED") throw new Error("Time entry is locked (on an invoice)");
  if (entry.status !== "DRAFT") throw new Error("Only draft entries can be edited");
  // Members can only edit their own drafts
  if (entry.userId !== ctx.userId && ctx.role === "MEMBER") throw new Error("Forbidden");

  return prisma.timeEntry.update({ where: { id }, data: input });
}

export async function deleteTimeEntry(ctx: TenantContext, id: string) {
  const entry = await prisma.timeEntry.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!entry) throw new Error("Time entry not found");
  if (entry.status === "LOCKED") throw new Error("Cannot delete a locked entry");
  if (entry.status === "APPROVED") throw new Error("Cannot delete an approved entry; ask a manager to reject it first");
  if (entry.userId !== ctx.userId && ctx.role === "MEMBER") throw new Error("Forbidden");
  await prisma.timeEntry.delete({ where: { id } });
}

export async function submitTimeEntry(ctx: TenantContext, id: string) {
  const entry = await prisma.timeEntry.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!entry) throw new Error("Time entry not found");
  if (entry.userId !== ctx.userId && ctx.role === "MEMBER") throw new Error("Forbidden");
  if (entry.status !== "DRAFT") throw new Error("Only drafts can be submitted");

  return prisma.timeEntry.update({ where: { id }, data: { status: "SUBMITTED" } });
}

export async function approveTimeEntry(ctx: TenantContext, id: string) {
  const entry = await prisma.timeEntry.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!entry) throw new Error("Time entry not found");
  if (entry.status !== "SUBMITTED") throw new Error("Only submitted entries can be approved");

  return prisma.timeEntry.update({
    where: { id },
    data: { status: "APPROVED", approvedBy: ctx.userId, approvedAt: new Date() },
  });
}

export async function rejectTimeEntry(ctx: TenantContext, id: string) {
  const entry = await prisma.timeEntry.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!entry) throw new Error("Time entry not found");
  if (entry.status !== "SUBMITTED" && entry.status !== "APPROVED") {
    throw new Error("Only submitted or approved entries can be rejected");
  }

  return prisma.timeEntry.update({
    where: { id },
    data: { status: "DRAFT", approvedBy: null, approvedAt: null },
  });
}