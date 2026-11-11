import { NextResponse } from "next/server";
import { requireApiTenantContext } from "@/lib/tenancy/resolve";
import { canManageBilling } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";

export async function POST() {
  const ctx = await requireApiTenantContext();
  if (!canManageBilling(ctx.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await prisma.zohoConnection.deleteMany({ where: { tenantId: ctx.tenantId } });
  return NextResponse.json({ ok: true });
}
