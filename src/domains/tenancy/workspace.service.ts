import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ensureChartOfAccounts } from "@/domains/bookkeeping/ledger.service";
import type { TenantContext } from "@/lib/tenancy/context";

export function slugifyWorkspaceName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "workspace"
  );
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 0;
  while (true) {
    const existing = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return slug;
    n += 1;
    slug = `${base.slice(0, 36)}-${n}`;
  }
}

export async function createWorkspace(userId: string, name: string) {
  const slug = await uniqueSlug(slugifyWorkspaceName(name));

  const tenant = await prisma.$transaction(async (tx) => {
    const created = await tx.tenant.create({
      data: { name: name.trim(), slug },
    });
    await tx.membership.create({
      data: {
        userId,
        tenantId: created.id,
        role: Role.OWNER,
        status: "ACTIVE",
      },
    });
    return created;
  });

  const ctx: TenantContext = {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    userId,
    role: Role.OWNER,
    email: "",
  };
  await ensureChartOfAccounts(ctx);

  return tenant;
}

/** Renames the active workspace. Slug stays stable. */
export async function updateWorkspaceName(ctx: TenantContext, name: string) {
  return prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: { name: name.trim() },
  });
}
