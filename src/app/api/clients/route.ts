import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { hasRole } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";

const Body = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  billingAddress: z.string().max(500).optional(),
  currency: z.string().length(3).default("USD"),
  defaultRateCents: z.number().int().min(0).default(0),
  taxRateBps: z.number().int().min(0).max(10000).default(0),
});

export async function GET() {
  const ctx = await requireApiTenantContext();
  const clients = await prisma.client.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(clients);
}

export async function POST(req: Request) {
  const ctx = await requireApiTenantContext();
  if (!hasRole(ctx.role, Role.MANAGER)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { email, ...rest } = parsed.data;
  const client = await prisma.client.create({
    data: { ...rest, email: email ?? null, tenantId: ctx.tenantId },
  });
  return NextResponse.json(client);
}