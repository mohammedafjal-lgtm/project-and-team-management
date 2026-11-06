import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";

export type TenantContext = {
  tenantId: string;
  tenantSlug: string;
  userId: string;
  role: Role;
  email: string;
};

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

export async function requireTenantContext(resolvedTenantId: string | null): Promise<TenantContext> {
  if (!resolvedTenantId) throw new UnauthorizedError("No tenant resolved");

  const session = await getSession();
  if (!session) throw new UnauthorizedError("No session");

  const membership = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: session.userId, tenantId: resolvedTenantId } },
    include: { tenant: true },
  });

  if (!membership || membership.status !== "ACTIVE") {
    throw new ForbiddenError("No access to this tenant");
  }

  return {
    tenantId: membership.tenantId,
    tenantSlug: membership.tenant.slug,
    userId: session.userId,
    role: membership.role,
    email: session.email,
  };
}

export function assertRole(ctx: TenantContext, required: Role) {
  if (!hasRole(ctx.role, required)) throw new ForbiddenError(`Requires ${required}`);
}