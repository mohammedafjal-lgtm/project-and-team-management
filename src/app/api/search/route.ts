import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/tenancy/context";
import { headers } from "next/headers";

export async function GET(req: Request) {
  const h = await headers();
  const ctx = await requireTenantContext(h.get("x-tenant-id"));
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ projects: [], invoices: [], clients: [] });

  const contains = { contains: q, mode: "insensitive" as const };

  const [projects, invoices, clients] = await Promise.all([
    prisma.project.findMany({
      where: { tenantId: ctx.tenantId, name: contains },
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