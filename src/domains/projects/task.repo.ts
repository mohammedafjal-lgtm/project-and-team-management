import { prisma } from "@/lib/db/prisma";
import { TenantContext } from "@/lib/tenancy/context";
import { assertCanAccessProject, validateAssigneeIds } from "./project-access";

export type TaskDto = {
  id: string;
  title: string;
  description: string;
  status: string;
  assigneeIds: string[];
  estimateMinutes: number | null;
  dueDate: string | null;
};

function toDto(t: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  assigneeIds: string[];
  estimateMinutes: number | null;
  dueDate: Date | null;
}): TaskDto {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? "",
    status: t.status,
    assigneeIds: t.assigneeIds,
    estimateMinutes: t.estimateMinutes,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
  };
}

export async function listTasks(ctx: TenantContext, projectId: string) {
  await assertCanAccessProject(ctx, projectId);
  const tasks = await prisma.task.findMany({
    where: { tenantId: ctx.tenantId, projectId },
    orderBy: { createdAt: "asc" },
  });
  return tasks.map(toDto);
}

export async function updateTaskStatus(
  ctx: TenantContext,
  taskId: string,
  status: "TODO" | "IN_PROGRESS" | "DONE"
) {
  const task = await prisma.task.findFirst({ where: { id: taskId, tenantId: ctx.tenantId } });
  if (!task) throw new Error("Task not found");
  await assertCanAccessProject(ctx, task.projectId);
  const updated = await prisma.task.update({ where: { id: taskId }, data: { status } });
  return toDto(updated);
}

export async function createTask(
  ctx: TenantContext,
  input: {
    projectId: string;
    title: string;
    description?: string;
    status?: "TODO" | "IN_PROGRESS" | "DONE";
    assigneeIds?: string[];
    estimateMinutes?: number | null;
    dueDate?: string | null;
  }
) {
  await assertCanAccessProject(ctx, input.projectId);
  const assigneeIds = input.assigneeIds ?? [];
  await validateAssigneeIds(ctx, input.projectId, assigneeIds);

  const task = await prisma.task.create({
    data: {
      tenantId: ctx.tenantId,
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      status: input.status ?? "TODO",
      assigneeIds,
      estimateMinutes: input.estimateMinutes ?? null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      createdBy: ctx.userId,
    },
  });
  return toDto(task);
}

export async function updateTask(
  ctx: TenantContext,
  taskId: string,
  input: {
    status?: "TODO" | "IN_PROGRESS" | "DONE";
    title?: string;
    description?: string | null;
    assigneeIds?: string[];
    estimateMinutes?: number | null;
    dueDate?: string | null;
  }
) {
  const task = await prisma.task.findFirst({ where: { id: taskId, tenantId: ctx.tenantId } });
  if (!task) throw new Error("Task not found");
  await assertCanAccessProject(ctx, task.projectId);

  if (input.assigneeIds) {
    await validateAssigneeIds(ctx, task.projectId, input.assigneeIds);
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.assigneeIds !== undefined ? { assigneeIds: input.assigneeIds } : {}),
      ...(input.estimateMinutes !== undefined ? { estimateMinutes: input.estimateMinutes } : {}),
      ...(input.dueDate !== undefined
        ? { dueDate: input.dueDate ? new Date(input.dueDate) : null }
        : {}),
    },
  });
  return toDto(updated);
}

export async function deleteTask(ctx: TenantContext, taskId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, tenantId: ctx.tenantId } });
  if (!task) throw new Error("Task not found");
  await assertCanAccessProject(ctx, task.projectId);
  await prisma.task.delete({ where: { id: taskId } });
}
