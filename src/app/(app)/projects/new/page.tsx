import Link from "next/link";
import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { NewProjectForm } from "@/app/(app)/projects/new/_form";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const ctx = await getTenantContext();
  const clients = await prisma.client.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, currency: true },
  });

  if (clients.length === 0) {
    return (
      <div className="max-w-xl border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg p-12 text-center">
        <p className="font-medium">Create a client first</p>
        <p className="text-sm text-neutral-500 mt-1">
          Projects belong to a client. Add one to get started.
        </p>
        <Button asChild className="mt-4"><Link href="/clients/new">New client</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
        <p className="text-sm text-neutral-500 mt-1">
          A project ties work to a client and a budget.
        </p>
      </div>
      <NewProjectForm clients={clients} defaultClientId={clientId} />
    </div>
  );
}