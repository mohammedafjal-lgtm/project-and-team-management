import { prisma } from "@/lib/db/prisma";
import { TenantContext } from "@/lib/tenancy/context";

export async function getTenantById(ctx: TenantContext) {
  return prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
  });
}

export async function listMembers(ctx: TenantContext) {
  return prisma.membership.findMany({
    where: { tenantId: ctx.tenantId, status: "ACTIVE" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
}