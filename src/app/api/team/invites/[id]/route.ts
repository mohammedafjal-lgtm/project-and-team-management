import { NextResponse } from "next/server";
import { requireApiTenantContext } from "@/lib/tenancy/resolve";
import { canManageTeam } from "@/lib/auth/permissions";
import { revokeInvitation } from "@/domains/team/team.service";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiTenantContext();
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
