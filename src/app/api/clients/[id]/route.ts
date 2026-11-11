import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireApiTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { hasRole } from "@/lib/auth/permissions";

const PatchBody = z.object({
  name: z.string().min(1).max(100),
  email: z.union([z.string().email(), z.literal(""), z.null()]).optional(),
  billingAddress: z.union([z.string().max(500), z.literal(""), z.null()]).optional(),
  currency: z.string().length(3),
  defaultRateCents: z.number().int().min(0),
  taxRateBps: z.number().int().min(0).max(10000),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiTenantContext();
  if (!hasRole(ctx.role, Role.MANAGER)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = PatchBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.client.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const { email, billingAddress, currency, ...rest } = parsed.data;
  const client = await prisma.client.update({
    where: { id: existing.id },
    data: {
      ...rest,
      currency: currency.toUpperCase(),
      email: email ? email : null,
      billingAddress: billingAddress?.trim() ? billingAddress.trim() : null,
    },
  });

  return NextResponse.json(client);
}
