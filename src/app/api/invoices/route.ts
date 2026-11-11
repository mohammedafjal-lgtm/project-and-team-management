import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { createInvoice } from "@/domains/billing/invoice.service";
import { hasRole } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";

const Line = z.object({
  description: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPriceCents: z.number().int().min(0),
});

const Body = z.object({
  clientId: z.string().min(1),
  issueDate: z.string(),
  dueDate: z.string(),
  taxRateBps: z.number().int().min(0).max(10000),
  lineItems: z.array(Line).min(1),
});

export async function POST(req: Request) {
  const ctx = await requireApiTenantContext();

  if (!hasRole(ctx.role, Role.MANAGER)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { clientId, issueDate, dueDate, taxRateBps, lineItems } = parsed.data;

  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ message: "Client not found" }, { status: 404 });
  }

  try {
    const invoice = await createInvoice(ctx, {
      clientId,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      taxRateBps,
      lineItems,
    });
    return NextResponse.json(invoice);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to create invoice" },
      { status: 400 }
    );
  }
}