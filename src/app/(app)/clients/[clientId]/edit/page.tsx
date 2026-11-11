import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { getTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { hasRole } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { ClientEditForm } from "@/components/clients/client-edit-form";

export default async function EditClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const ctx = await getTenantContext();

  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: ctx.tenantId },
  });
  if (!client) notFound();

  const canEdit = hasRole(ctx.role, Role.MANAGER);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <p className="text-xs text-neutral-500 uppercase tracking-wider">Client</p>
        <h1 className="text-2xl font-semibold tracking-tight">Edit {client.name}</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Update the name, billing details, and default rates used on new work.
        </p>
      </div>

      {canEdit ? (
        <ClientEditForm
          client={{
            id: client.id,
            name: client.name,
            email: client.email,
            billingAddress: client.billingAddress,
            currency: client.currency,
            defaultRateCents: client.defaultRateCents,
            taxRateBps: client.taxRateBps,
          }}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-neutral-500">Only managers can edit client details.</p>
          <Button variant="outline" asChild>
            <Link href={`/clients/${client.id}`}>Back to client</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
