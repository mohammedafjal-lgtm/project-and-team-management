import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getTenantContext } from "@/lib/tenancy/resolve";
import { canCreateWorkspace } from "@/lib/auth/permissions";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { prisma } from "@/lib/db/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  let ctx;
  try {
    ctx = await getTenantContext();
  } catch {
    redirect("/login");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { name: true, slug: true },
  });
  if (!tenant) redirect("/login");

  const memberships = await prisma.membership.findMany({
    where: { userId: ctx.userId, status: "ACTIVE" },
    include: { tenant: { select: { name: true, slug: true } } },
  });

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        tenantName={tenant.name}
        tenantSlug={tenant.slug}
        userEmail={session.email}
        tenants={memberships.map((m) => m.tenant)}
        canCreateWorkspace={canCreateWorkspace(session.email)}
      />
      <div className="pl-[260px]">
        <Topbar />
        <main className="p-8 max-w-6xl mx-auto">{children}</main>
      </div>
    </div>
  );
}