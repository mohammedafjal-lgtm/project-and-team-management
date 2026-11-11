import { NextResponse } from "next/server";
import { requireApiTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const ctx = await requireApiTenantContext();
  const members = await prisma.membership.findMany({
    where: { tenantId: ctx.tenantId, status: "ACTIVE" },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      membershipId: m.id,
    }))
  );
}
