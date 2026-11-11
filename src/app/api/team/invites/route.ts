import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiTenantContext } from "@/lib/tenancy/resolve";
import { canManageTeam, isAssignableRole } from "@/lib/auth/permissions";
import { inviteMember } from "@/domains/team/team.service";
import { Role } from "@prisma/client";

const Body = z.object({
  email: z.string().email(),
  role: z.nativeEnum(Role).default(Role.MEMBER).refine(isAssignableRole, {
    message: "Invalid role",
  }),
});

export async function POST(req: Request) {
  const ctx = await requireApiTenantContext();
  if (!canManageTeam(ctx.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const invitation = await inviteMember(ctx, parsed.data);
    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to invite" },
      { status: 400 }
    );
  }
}
