import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { Role } from "@prisma/client";
import { requireTenantContext } from "@/lib/tenancy/context";
import { canManageTeam, isAssignableRole } from "@/lib/auth/permissions";
import { updateMemberRole } from "@/domains/team/team.service";

const Body = z.object({
  role: z.nativeEnum(Role).refine(isAssignableRole, { message: "Invalid role" }),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const h = await headers();
  const ctx = await requireTenantContext(h.get("x-tenant-id"));
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
