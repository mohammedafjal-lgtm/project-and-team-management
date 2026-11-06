import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { tenantUrl } from "@/lib/auth/tenant-redirect";

export default async function Home() {
  const session = await getSession();
  if (session) {
    const membership = await prisma.membership.findFirst({
      where: { userId: session.userId, status: "ACTIVE" },
      include: { tenant: true },
    });
    if (membership) redirect(tenantUrl(membership.tenant.slug));
  }
  redirect("/login");
}