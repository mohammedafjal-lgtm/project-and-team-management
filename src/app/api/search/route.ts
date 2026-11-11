import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireApiTenantContext } from "@/lib/tenancy/resolve";
import { visibleProjectWhere } from "@/domains/projects/project-access";

export async function GET(req: Request) {
  const ctx = await requireApiTenantContext();
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ projects: [], invoices: [], clients: [] });

  const contains = { contains: q, mode: "insensitive" as const };

  const [projects, invoices, clients] = await Promise.all([
    prisma.project.findMany({
      where: { ...visibleProjectWhere(ctx), name: contains },
      select: { id: true, name: true },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: { tenantId: ctx.tenantId, number: contains },
      select: { id: true, number: true, client: { select: { name: true } } },
      take: 5,
    }),
    prisma.client.findMany({
      where: { tenantId: ctx.tenantId, name: contains },
      select: { id: true, name: true },
      take: 5,
    }),
  ]);

  return NextResponse.json({ projects, invoices, clients });
}