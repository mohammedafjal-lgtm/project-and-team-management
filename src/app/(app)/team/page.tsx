import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date";

export default async function TeamPage() {
  const ctx = await getTenantContext();
  const memberships = await prisma.membership.findMany({
    where: { tenantId: ctx.tenantId },
    include: { user: true },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-neutral-500 mt-1">{memberships.length} members</p>
      </div>

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-950">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900 text-left text-xs text-neutral-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {memberships.map((m) => (
              <tr key={m.id} className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="px-4 py-3 font-medium">{m.user.name ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                  {m.user.email}
                </td>
                <td className="px-4 py-3"><Badge variant="outline">{m.role}</Badge></td>
                <td className="px-4 py-3">
                  <Badge variant={m.status === "ACTIVE" ? "default" : "secondary"}>
                    {m.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {formatDate(m.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-neutral-500">
        Invitations and role management land in v2. Until then, members are added
        during signup.
      </p>
    </div>
  );
}