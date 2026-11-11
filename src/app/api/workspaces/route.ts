import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { setSessionCookie } from "@/lib/auth/session";
import { requireApiTenantContext } from "@/lib/tenancy/resolve";
import { canCreateWorkspace, hasRole } from "@/lib/auth/permissions";
import { createWorkspace, updateWorkspaceName } from "@/domains/tenancy/workspace.service";

const Body = z.object({
  name: z.string().trim().min(2).max(80),
});

export async function POST(req: Request) {
  const ctx = await requireApiTenantContext();
  if (!canCreateWorkspace(ctx.email)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  const tenant = await createWorkspace(ctx.userId, parsed.data.name);
  const response = NextResponse.json({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    redirectTo: "/dashboard",
  });
  await setSessionCookie(response, {
    userId: ctx.userId,
    email: ctx.email,
    activeTenantId: tenant.id,
  });
  return response;
}

export async function PATCH(req: Request) {
  const ctx = await requireApiTenantContext();
  if (!hasRole(ctx.role, Role.ADMIN)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  const tenant = await updateWorkspaceName(ctx, parsed.data.name);
  return NextResponse.json({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
  });
}
