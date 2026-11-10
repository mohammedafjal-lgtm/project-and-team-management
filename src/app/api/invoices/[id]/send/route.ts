import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireTenantContext } from "@/lib/tenancy/context";
import { issueInvoice } from "@/domains/billing/invoice.service";
import { hasRole } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const h = await headers();
  const ctx = await requireTenantContext(h.get("x-tenant-id"));
  if (!hasRole(ctx.role, Role.MANAGER)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  try {
    const invoice = await issueInvoice(ctx, id);
    return NextResponse.json(invoice);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}