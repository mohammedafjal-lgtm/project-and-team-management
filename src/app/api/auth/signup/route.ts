import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { tenantUrl } from "@/lib/auth/tenant-redirect";

const Body = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  tenantName: z.string().min(2).max(60),
});

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { name, email, password, tenantName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ message: "Email already in use" }, { status: 409 });

  let slug = slugify(tenantName);
  const slugExists = await prisma.tenant.findUnique({ where: { slug } });
  if (slugExists) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const passwordHash = await hashPassword(password);

  const { user, tenant } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name, email, passwordHash } });
    const tenant = await tx.tenant.create({ data: { name: tenantName, slug } });
    await tx.membership.create({
      data: { userId: user.id, tenantId: tenant.id, role: "OWNER", status: "ACTIVE" },
    });
    return { user, tenant };
  });

  await createSession({ userId: user.id, email: user.email, activeTenantId: tenant.id });

  return NextResponse.json({ redirectTo: tenantUrl(tenant.slug) });
}