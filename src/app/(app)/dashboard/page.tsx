import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { money } from "@/lib/money";
import { visibleProjectWhere } from "@/domains/projects/project-access";
import type { TenantContext } from "@/lib/tenancy/context";

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

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 bg-white dark:bg-neutral-950">
      <p className="text-xs text-neutral-500 uppercase tracking-wider">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

export default async function DashboardPage() {
  const ctx = await getTenantContext();
  const m = await metrics(ctx);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-1">{ctx.tenantSlug}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Active projects" value={String(m.projects)} />
        <Card label="Outstanding" value={money(m.outstandingCents)} hint="Unpaid invoices" />
        <Card label="Hours this week" value={(m.minutesThisWeek / 60).toFixed(1)} hint="All users" />
        <Card label="Revenue (ledger)" value={money(m.revenueCents)} hint="From account 4000" />
      </div>
    </div>
  );
}