import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiTenantContext } from "@/lib/tenancy/resolve";
import { canManageBilling } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  createZohoInvoiceFromLocal,
  listZohoInvoicesForClient,
  updateZohoInvoiceFromLocal,
} from "@/domains/integrations/zoho-invoice.service";

const Body = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("create") }),
  z.object({
    mode: z.literal("update"),
    zohoInvoiceId: z.string().min(1),
  }),
  z.object({ mode: z.literal("list") }),
]);

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiTenantContext();
  if (!canManageBilling(ctx.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: { clientId: true, zohoInvoiceId: true, zohoInvoiceNumber: true },
  });
  if (!invoice) return NextResponse.json({ message: "Not found" }, { status: 404 });

  try {
    const invoices = await listZohoInvoicesForClient(ctx, invoice.clientId);
    return NextResponse.json({
      linkedZohoInvoiceId: invoice.zohoInvoiceId,
      linkedZohoInvoiceNumber: invoice.zohoInvoiceNumber,
      invoices,
    });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to list Zoho invoices" },
      { status: 400 }
    );
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiTenantContext();
  if (!canManageBilling(ctx.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input" }, { status: 400 });
  }

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!invoice) return NextResponse.json({ message: "Not found" }, { status: 404 });

  try {
    if (parsed.data.mode === "list") {
      return NextResponse.json({ ok: true });
    }
    if (parsed.data.mode === "create") {
      const updated = await createZohoInvoiceFromLocal(ctx, id);
      return NextResponse.json({
        zohoInvoiceId: updated.zohoInvoiceId,
        zohoInvoiceNumber: updated.zohoInvoiceNumber,
      });
    }
    const updated = await updateZohoInvoiceFromLocal(ctx, id, parsed.data.zohoInvoiceId);
    return NextResponse.json({
      zohoInvoiceId: updated.zohoInvoiceId,
      zohoInvoiceNumber: updated.zohoInvoiceNumber,
    });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Zoho sync failed" },
      { status: 400 }
    );
  }
}
