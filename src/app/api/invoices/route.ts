import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { requireTenantContext } from "@/lib/tenancy/context";
import { prisma } from "@/lib/db/prisma";
import { computeInvoiceTotals } from "@/domains/billing/invoice.service";
import { ensureChartOfAccounts } from "@/domains/bookkeeping/ledger.service";
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

async function withSerializableRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      last = err;
      const code = (err as { code?: string }).code;
      if (code === "P2034" && i < attempts - 1) continue;
      throw err;
    }
  }
  throw last;
}

export async function POST(req: Request) {
  const h = await headers();
  const ctx = await requireTenantContext(h.get("x-tenant-id"));

  if (!hasRole(ctx.role, Role.MANAGER)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { clientId, issueDate, dueDate, taxRateBps, lineItems } = parsed.data;

  // Tenant isolation: the referenced client must belong to this tenant.
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ message: "Client not found" }, { status: 404 });
  }

  await ensureChartOfAccounts(ctx);

  const { subtotalCents, taxCents, totalCents } = computeInvoiceTotals(lineItems, taxRateBps);

  // Serializable isolation + retry-on-conflict makes the "read last number,
  // then insert" race-free per tenant. The @@unique([tenantId, number])
  // constraint is the safety net.
  const invoice = await withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const tenant = await tx.tenant.findUnique({ where: { id: ctx.tenantId } });
        if (!tenant) throw new Error("Tenant not found");

        const last = await tx.invoice.findFirst({
          where: { tenantId: ctx.tenantId },
          orderBy: { createdAt: "desc" },
          select: { number: true },
        });
        const nextNum = last ? String(parseInt(last.number, 10) + 1) : "1001";

        return tx.invoice.create({
          data: {
            tenantId: ctx.tenantId,
            clientId,
            number: nextNum,
            issueDate: new Date(issueDate),
            dueDate: new Date(dueDate),
            subtotalCents,
            taxCents,
            totalCents,
            lineItems: {
              create: lineItems.map((l, i) => ({
                tenantId: ctx.tenantId,
                description: l.description,
                quantity: l.quantity,
                unitPriceCents: l.unitPriceCents,
                amountCents: l.unitPriceCents * l.quantity,
                sortOrder: i,
              })),
            },
          },
        });
      },
      { isolationLevel: "Serializable" }
    )
  );

  return NextResponse.json(invoice);
}