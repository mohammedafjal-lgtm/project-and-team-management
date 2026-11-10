import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { requireTenantContext } from "@/lib/tenancy/context";
import { prisma } from "@/lib/db/prisma";
import { createInvoice } from "@/domains/billing/invoice.service";
import { hasRole } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";

const Body = z.object({
  timeEntryIds: z.array(z.string()).min(1),
  issueDate: z.string(),
  dueDate: z.string(),
  taxRateBps: z.number().int().min(0).max(10000).default(0),
});

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
  const { timeEntryIds, issueDate, dueDate, taxRateBps } = parsed.data;

  const entries = await prisma.timeEntry.findMany({
    where: {
      tenantId: ctx.tenantId,
      id: { in: timeEntryIds },
      status: "APPROVED",
      invoiceId: null,
      billable: true,
    },
    include: { project: { select: { id: true, name: true, clientId: true } } },
  });
  if (entries.length === 0) {
    return NextResponse.json({ message: "No billable, unbilled, approved entries in selection" }, { status: 400 });
  }
  if (entries.length !== timeEntryIds.length) {
    return NextResponse.json(
      { message: "Some entries were not eligible (must be APPROVED, unbilled, billable)" },
      { status: 400 }
    );
  }

  const clientIds = new Set(entries.map((e) => e.project.clientId));
  if (clientIds.size !== 1) {
    return NextResponse.json({ message: "All selected entries must belong to one client" }, { status: 400 });
  }
  const clientId = entries[0].project.clientId;

  // Group by project + rate
  const groups = new Map<string, { projectName: string; minutes: number; rateCents: number }>();
  for (const e of entries) {
    const key = `${e.projectId}:${e.rateCentsSnapshot}`;
    const g = groups.get(key) ?? {
      projectName: e.project.name,
      minutes: 0,
      rateCents: e.rateCentsSnapshot,
    };
    g.minutes += e.durationMinutes;
    groups.set(key, g);
  }

  const lineItems = [...groups.values()].map((g) => {
    const hours = g.minutes / 60;
    const amountCents = Math.round(hours * g.rateCents);
    return {
      description: `${g.projectName} — ${hours.toFixed(2)} hours`,
      // Represent hours in hundredths; display-only.
      quantity: Math.round(hours * 100),
      unitPriceCents: Math.round(g.rateCents / 100), // informational per "unit"
      amountCents,
    };
  });

  try {
    const invoice = await createInvoice(ctx, {
      clientId,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      taxRateBps,
      lineItems,
      lockTimeEntryIds: entries.map((e) => e.id),
    });
    return NextResponse.json(invoice);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to create invoice" },
      { status: 400 }
    );
  }
}