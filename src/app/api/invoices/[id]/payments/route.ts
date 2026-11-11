import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiTenantContext } from "@/lib/tenancy/resolve";
import { recordManualPayment } from "@/domains/billing/payment.service";
import { hasRole } from "@/lib/auth/permissions";
import { Role } from "@prisma/client";

const Body = z.object({
  amountCents: z.number().int().min(1),
  method: z.enum(["MANUAL", "BANK_TRANSFER", "STRIPE"]).default("MANUAL"),
  reference: z.string().max(200).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiTenantContext();
  if (!hasRole(ctx.role, Role.MANAGER)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const payment = await recordManualPayment(ctx, id, parsed.data);
    return NextResponse.json(payment);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to record payment" },
      { status: 400 }
    );
  }
}