import { prisma } from "@/lib/db/prisma";
import { TenantContext } from "@/lib/tenancy/context";

export async function listTasks(ctx: TenantContext, projectId: string) {
  return prisma.task.findMany({
    where: { tenantId: ctx.tenantId, projectId },
    orderBy: { createdAt: "asc" },
  });
}

export async function updateTaskStatus(
  ctx: TenantContext,
  taskId: string,
  status: "TODO" | "IN_PROGRESS" | "DONE"
) {
  const task = await prisma.task.findFirst({ where: { id: taskId, tenantId: ctx.tenantId } });
  if (!task) throw new Error("Task not found");
  return prisma.task.update({ where: { id: taskId }, data: { status } });
}

export async function createTask(
  ctx: TenantContext,
  input: { projectId: string; title: string; description?: string; status?: "TODO" | "IN_PROGRESS" | "DONE" }
) {
  // Verify the project belongs to this tenant before creating the task.
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!project) throw new Error("Project not found");

  return prisma.task.create({
    data: {
      tenantId: ctx.tenantId,
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      status: input.status ?? "TODO",
      createdBy: ctx.userId,
    },
  });
}