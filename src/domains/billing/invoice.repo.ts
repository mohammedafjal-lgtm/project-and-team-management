import { prisma } from "@/lib/db/prisma";
import { TenantContext } from "@/lib/tenancy/context";

export async function listInvoices(ctx: TenantContext) {
  return prisma.invoice.findMany({
    where: { tenantId: ctx.tenantId },
    include: { client: true, payments: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInvoice(ctx: TenantContext, id: string) {
  return prisma.invoice.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: { client: true, lineItems: { orderBy: { sortOrder: "asc" } }, payments: true, timeEntries: true },
  });
}