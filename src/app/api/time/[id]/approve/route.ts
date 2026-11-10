import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireTenantContext } from "@/lib/tenancy/context";
import { approveTimeEntry } from "@/domains/time/time.repo";
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
    return NextResponse.json(await approveTimeEntry(ctx, id));
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}