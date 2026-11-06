import { prisma } from "@/lib/db/prisma";
import { TenantContext } from "@/lib/tenancy/context";

export async function listProjects(ctx: TenantContext) {
  return prisma.project.findMany({
    where: { tenantId: ctx.tenantId },
    include: { client: true, _count: { select: { tasks: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createProject(ctx: TenantContext, input: { name: string; clientId: string; code?: string; budgetType?: string; budgetMinutes?: number; budgetCents?: number }) {
  return prisma.project.create({
    data: {
      ...input,
      tenantId: ctx.tenantId,
    },
  });
}