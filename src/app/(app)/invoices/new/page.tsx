import Link from "next/link";
import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { NewInvoiceForm } from "@/app/(app)/invoices/new/_form";

export default async function NewInvoicePage() {
  const ctx = await getTenantContext();
  const clients = await prisma.client.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, currency: true, taxRateBps: true },
  });

  if (clients.length === 0) {
    return (
      <div className="max-w-xl border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg p-12 text-center">
        <p className="font-medium">Create a client first</p>
        <p className="text-sm text-neutral-500 mt-1">
          Invoices are billed to a client.
        </p>
        <Button asChild className="mt-4"><Link href="/clients/new">New client</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New invoice</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Draft an invoice and issue it when you are ready.
        </p>
      </div>
      <NewInvoiceForm clients={clients} />
    </div>
  );
}