import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getSession, setSessionCookie } from "@/lib/auth/session";

const Body = z.object({
  tenantSlug: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: parsed.data.tenantSlug },
    select: { id: true },
  });
  if (!tenant) {
    return NextResponse.json({ message: "Workspace not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_tenantId: { userId: session.userId, tenantId: tenant.id },
    },
    select: { status: true },
  });
  if (!membership || membership.status !== "ACTIVE") {
    return NextResponse.json({ message: "No access to this workspace" }, { status: 403 });
  }

  const response = NextResponse.json({ redirectTo: "/dashboard" });
  await setSessionCookie(response, {
    userId: session.userId,
    email: session.email,
    activeTenantId: tenant.id,
  });
  return response;
}
