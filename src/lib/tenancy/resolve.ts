import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { requireTenantContext, TenantContext, UnauthorizedError } from "./context";

async function resolveActiveTenantId(userId: string, preferredTenantId?: string): Promise<string | null> {
  if (preferredTenantId) {
    const preferred = await prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId: preferredTenantId } },
      select: { tenantId: true, status: true },
    });
    if (preferred?.status === "ACTIVE") return preferred.tenantId;
  }

  const fallback = await prisma.membership.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { tenantId: true },
    orderBy: { createdAt: "asc" },
  });
  return fallback?.tenantId ?? null;
}

/**
 * Resolve the current workspace from the session's activeTenantId
 * (falls back to the user's first ACTIVE membership).
 */
export async function getTenantContext(): Promise<TenantContext> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError("No session");

  const tenantId = await resolveActiveTenantId(session.userId, session.activeTenantId);
  if (!tenantId) throw new UnauthorizedError("No tenant resolved");

  return requireTenantContext(tenantId);
}

/** Alias for route handlers — same session-based resolution as pages. */
export const requireApiTenantContext = getTenantContext;
