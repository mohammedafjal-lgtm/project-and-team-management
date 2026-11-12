import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { money } from "@/lib/money";

async function accountBalance(tenantId: string) {
  const rows = await prisma.journalLine.groupBy({
    by: ["accountId"],
    where: { tenantId },
    _sum: { debitCents: true, creditCents: true },
  });
  const accounts = await prisma.ledgerAccount.findMany({
    where: { tenantId },
    orderBy: { code: "asc" },
  });
  const map = new Map(rows.map((r) => [r.accountId, r._sum]));
  return accounts.map((a) => {
    const sums = map.get(a.id);
    const debit = sums?.debitCents ?? 0;
    const credit = sums?.creditCents ?? 0;
    const balance = a.normalBalance === "DEBIT" ? debit - credit : credit - debit;
    return { ...a, balanceCents: balance };
  });
}

export default async function BookkeepingPage() {
  const ctx = await getTenantContext();
  const accounts = await accountBalance(ctx.tenantId);
  const totalDebits = accounts.filter((a) => a.normalBalance === "DEBIT").reduce((s, a) => s + a.balanceCents, 0);
  const totalCredits = accounts.filter((a) => a.normalBalance === "CREDIT").reduce((s, a) => s + a.balanceCents, 0);
  const balanced = totalDebits === totalCredits;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chart of accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">Live balances from the double-entry ledger</p>
        </div>
        <div className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-sm border ${balanced ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900" : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900"}`}>
          {balanced ? "Balanced" : "Out of balance"}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Code</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {accounts.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No accounts yet. Issue an invoice to create the system chart of accounts.</td></tr>
            ) : accounts.map((a) => (
              <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{a.code}</td>
                <td className="px-6 py-4 font-medium">{a.name}</td>
                <td className="px-6 py-4 text-muted-foreground">{a.type}</td>
                <td className="px-6 py-4 text-right tabular-nums font-medium">{money(a.balanceCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}