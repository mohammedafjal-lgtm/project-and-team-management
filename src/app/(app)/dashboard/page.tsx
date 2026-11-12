import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { money } from "@/lib/money";
import { visibleProjectWhere } from "@/domains/projects/project-access";
import type { TenantContext } from "@/lib/tenancy/context";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { FolderKanban, Receipt, Clock, Banknote } from "lucide-react";
import { formatDate } from "@/lib/date";

async function metrics(ctx: TenantContext) {
  const tenantId = ctx.tenantId;
  const [projects, unpaid, timeThisWeek, revenue] = await Promise.all([
    prisma.project.count({ where: { ...visibleProjectWhere(ctx), status: "ACTIVE" } }),
    prisma.invoice.findMany({
      where: { tenantId, status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] } },
      select: { totalCents: true, amountPaidCents: true },
    }),
    prisma.timeEntry.aggregate({
      where: { tenantId, date: { gte: new Date(Date.now() - 7 * 86400000) } },
      _sum: { durationMinutes: true },
    }),
    prisma.journalLine.aggregate({
      where: { tenantId, account: { code: "4000" } },
      _sum: { creditCents: true },
    }),
  ]);
  return {
    projects,
    outstandingCents: unpaid.reduce((s, i) => s + (i.totalCents - i.amountPaidCents), 0),
    minutesThisWeek: timeThisWeek._sum.durationMinutes ?? 0,
    revenueCents: revenue._sum.creditCents ?? 0,
  };
}

export default async function DashboardPage() {
  const ctx = await getTenantContext();
  const m = await metrics(ctx);

  // Fetch recent invoices for the table
  const recentInvoices = await prisma.invoice.findMany({
    where: { tenantId: ctx.tenantId },
    include: { client: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your workspace</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Active Projects" value={String(m.projects)} icon={FolderKanban} color="teal" />
        <StatCard label="Outstanding" value={money(m.outstandingCents)} hint="Unpaid invoices" icon={Receipt} color="red" />
        <StatCard label="Hours this week" value={(m.minutesThisWeek / 60).toFixed(1)} hint="All users" icon={Clock} color="orange" />
        <StatCard label="Revenue (ledger)" value={money(m.revenueCents)} hint="From account 4000" icon={Banknote} color="green" />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Recent Invoices</h2>
            <p className="text-sm text-muted-foreground">Latest invoices generated</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Number</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No invoices yet.
                  </td>
                </tr>
              ) : (
                recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">#{inv.number}</td>
                    <td className="px-6 py-4 text-muted-foreground">{inv.client.name}</td>
                    <td className="px-6 py-4"><StatusBadge status={inv.status} /></td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(inv.issueDate)}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{money(inv.totalCents, inv.currency)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}