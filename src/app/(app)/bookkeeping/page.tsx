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
          <h1 className="text-2xl font-semibold tracking-tight">Chart of accounts</h1>
          <p className="text-sm text-neutral-500 mt-1">Live balances from the double-entry ledger</p>
        </div>
        <div className={`px-3 py-1.5 rounded-md text-xs font-medium ${balanced ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
          {balanced ? "Balanced" : "Out of balance"}
        </div>
      </div>
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-950">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900 text-left text-xs text-neutral-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2 font-medium">Code</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-neutral-500">No accounts yet. Issue an invoice to create the system chart of accounts.</td></tr>
            ) : accounts.map((a) => (
              <tr key={a.id} className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="px-4 py-3 font-mono text-xs">{a.code}</td>
                <td className="px-4 py-3">{a.name}</td>
                <td className="px-4 py-3 text-neutral-500">{a.type}</td>
                <td className="px-4 py-3 text-right">{money(a.balanceCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}