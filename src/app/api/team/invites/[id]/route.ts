import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireTenantContext } from "@/lib/tenancy/context";
import { canManageTeam } from "@/lib/auth/permissions";
import { revokeInvitation } from "@/domains/team/team.service";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const h = await headers();
  const ctx = await requireTenantContext(h.get("x-tenant-id"));
  if (!canManageTeam(ctx.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await revokeInvitation(ctx, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to revoke" },
      { status: 400 }
    );
  }
}
