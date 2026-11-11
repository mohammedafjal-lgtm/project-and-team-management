import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireApiTenantContext } from "@/lib/tenancy/resolve";
import { canManageTeam, isAssignableRole } from "@/lib/auth/permissions";
import { updateMemberRole } from "@/domains/team/team.service";

const Body = z.object({
  role: z.nativeEnum(Role).refine(isAssignableRole, { message: "Invalid role" }),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiTenantContext();
  if (!canManageTeam(ctx.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input" }, { status: 400 });
  }

  const { id } = await params;
  try {
    const membership = await updateMemberRole(ctx, id, parsed.data.role);
    return NextResponse.json(membership);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to update role" },
      { status: 400 }
    );
  }
}
