import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { requireTenantContext } from "@/lib/tenancy/context";
import { prisma } from "@/lib/db/prisma";

const Body = z.object({
  name: z.string().min(1).max(100),
  clientId: z.string().min(1),
  code: z.string().max(50).optional(),
  status: z.string().default("ACTIVE"),
  budgetType: z.enum(["NONE", "HOURS", "AMOUNT"]).default("NONE"),
  budgetMinutes: z.number().int().min(0).optional(),
  budgetCents: z.number().int().min(0).optional(),
});

export async function POST(req: Request) {
  const h = await headers();
  const ctx = await requireTenantContext(h.get("x-tenant-id"));
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { clientId, code, ...rest } = parsed.data;

  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: ctx.tenantId },
  });
  if (!client) {
    return NextResponse.json({ message: "Client not found" }, { status: 404 });
  }

  const project = await prisma.project.create({
    data: {
      ...rest,
      code: code || null,
      clientId,
      tenantId: ctx.tenantId,
    },
  });
  return NextResponse.json(project);
}