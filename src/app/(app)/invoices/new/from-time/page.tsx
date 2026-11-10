import Link from "next/link";
import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { FromTimeForm } from "./_form";

export default async function NewInvoiceFromTimePage() {
  const ctx = await getTenantContext();

  const entries = await prisma.timeEntry.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: "APPROVED",
      billable: true,
      invoiceId: null,
    },
    include: {
      project: { include: { client: { select: { id: true, name: true, currency: true, taxRateBps: true } } } },
      user: { select: { name: true, email: true } },
    },
    orderBy: [{ project: { client: { name: "asc" } } }, { project: { name: "asc" } }, { date: "asc" }],
  });

  if (entries.length === 0) {
    return (
      <div className="max-w-xl border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg p-12 text-center">
        <p className="font-medium">No billable time to invoice</p>
        <p className="text-sm text-neutral-500 mt-1">
          Approve some time entries first, then come back to bill them.
        </p>
        <Button asChild className="mt-4"><Link href="/time">Go to Time</Link></Button>
      </div>
    );
  }

  // Group clients for the form
  const clientsMap = new Map<string, { id: string; name: string; currency: string; taxRateBps: number }>();
  for (const e of entries) {
    const c = e.project.client;
    if (!clientsMap.has(c.id)) clientsMap.set(c.id, c);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bill time</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Select approved entries and a client; we&apos;ll draft an invoice from them.
        </p>
      </div>
      <FromTimeForm
        clients={[...clientsMap.values()]}
        entries={entries.map((e) => ({
          id: e.id,
          date: e.date.toISOString(),
          durationMinutes: e.durationMinutes,
          rateCents: e.rateCentsSnapshot,
          projectId: e.projectId,
          projectName: e.project.name,
          clientId: e.project.client.id,
          clientName: e.project.client.name,
          userName: e.user.name ?? e.user.email,
          notes: e.notes,
        }))}
      />
    </div>
  );
}