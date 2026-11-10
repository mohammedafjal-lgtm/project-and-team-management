import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { tenantUrl } from "@/lib/auth/tenant-redirect";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 400 });
  const { email, password, tenantSlug } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: { tenant: true },
  });
  if (memberships.length === 0) return NextResponse.json({ message: "No tenants for this user" }, { status: 403 });

  const target = tenantSlug ? memberships.find((m) => m.tenant.slug === tenantSlug) : memberships[0];
  if (!target) return NextResponse.json({ message: "You are not a member of this tenant" }, { status: 403 });

  const response = NextResponse.json({ redirectTo: tenantUrl(target.tenant.slug) });
  await setSessionCookie(response, {
    userId: user.id,
    email: user.email,
    activeTenantId: target.tenantId,
  });
  return response;
}
