import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { requireTenantContext } from "@/lib/tenancy/context";
import { voidInvoice } from "@/domains/billing/invoice.service";
import { hasRole } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";

const Body = z.object({ reason: z.string().max(500).optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const h = await headers();
  const ctx = await requireTenantContext(h.get("x-tenant-id"));
  if (!hasRole(ctx.role, Role.MANAGER)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 400 });

  try {
    const invoice = await voidInvoice(ctx, id, parsed.data.reason);
    return NextResponse.json(invoice);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to void" },
      { status: 400 }
    );
  }
}