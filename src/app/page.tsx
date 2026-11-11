import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { rootUrl } from "@/lib/auth/tenant-redirect";

export default async function Home() {
  const session = await getSession();
  if (session) {
    const preferred = session.activeTenantId
      ? await prisma.membership.findUnique({
          where: {
            userId_tenantId: {
              userId: session.userId,
              tenantId: session.activeTenantId,
            },
          },
          select: { status: true },
        })
      : null;

    if (preferred?.status === "ACTIVE") {
      redirect(rootUrl("/dashboard"));
    }

    const membership = await prisma.membership.findFirst({
      where: { userId: session.userId, status: "ACTIVE" },
      select: { id: true },
    });
    if (membership) redirect(rootUrl("/dashboard"));
  }
  redirect(rootUrl("/login"));
}
