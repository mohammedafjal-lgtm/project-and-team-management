'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useActiveTenant } from '@/hooks/use-active-tenant';
import { useMembership } from '@/hooks/use-membership';
import { useCreateInvoice, useInvoices } from '@/hooks/use-invoices';

interface DraftLine {
  description: string;
  quantity: string;
  unitAmountRupees: string;
}

const emptyLine = (): DraftLine => ({
  description: '',
  quantity: '1',
  unitAmountRupees: '',
});

export default function InvoicesPage() {
  const { activeTenantId } = useActiveTenant();
  const { canWrite } = useMembership(activeTenantId);
  const { data: invoices, isLoading } = useInvoices(activeTenantId);
  const createInvoice = useCreateInvoice(activeTenantId ?? '');

  const [clientName, setClientName] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Invoices</h1>

      {canWrite && (
        <form
          className="space-y-3 rounded-lg border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!clientName.trim()) return;

            const parsedLines = lines
              .map((l) => ({
                description: l.description.trim(),
                quantity: Number(l.quantity),
                unitAmountCents: Math.round(Number(l.unitAmountRupees) * 100),
              }))
              .filter(
                (l) =>
                  l.description &&
                  l.quantity > 0 &&
                  Number.isFinite(l.unitAmountCents) &&
                  l.unitAmountCents >= 0,
              );

            if (parsedLines.length === 0) return;

            createInvoice.mutate(
              { clientName: clientName.trim(), lines: parsedLines },
              {
                onSuccess: () => {
                  setClientName('');
                  setLines([emptyLine()]);
                },
              },
            );
          }}
        >
          <Input
            value={clientName}
            onChange={(e) => {
              setClientName(e.target.value);
            }}
            placeholder="Client name"
          />

          {lines.map((line, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={line.description}
                onChange={(e) => {
                  const v = e.target.value;
                  setLines((prev) =>
                    prev.map((x, j) => (j === i ? { ...x, description: v } : x)),
                  );
                }}
                placeholder="Description"
              />
              <Input
                value={line.quantity}
                onChange={(e) => {
                  const v = e.target.value;
                  setLines((prev) =>
                    prev.map((x, j) => (j === i ? { ...x, quantity: v } : x)),
                  );
                }}
                placeholder="Qty"
                inputMode="decimal"
                className="w-20"
              />
              <Input
                value={line.unitAmountRupees}
                onChange={(e) => {
                  const v = e.target.value;
                  setLines((prev) =>
                    prev.map((x, j) =>
                      j === i ? { ...x, unitAmountRupees: v } : x,
                    ),
                  );
                }}
                placeholder="₹ each"
                inputMode="decimal"
                className="w-28"
              />
            </div>
          ))}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setLines((p) => [...p, emptyLine()]);
              }}
            >
              Add line
            </Button>
            <Button type="submit" disabled={createInvoice.isPending}>
              {createInvoice.isPending ? 'Creating…' : 'Create invoice'}
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {invoices?.map((inv) => (
            <li key={inv._id} className="flex items-center justify-between p-3">
              <div>
                <div className="text-sm font-medium">
                  #{inv.invoiceNumber} · {inv.clientName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {inv.lines.length} line{inv.lines.length === 1 ? '' : 's'}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm">
                  ₹{(inv.totalCents / 100).toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-muted-foreground">{inv.status}</span>
              </div>
            </li>
          ))}
          {invoices?.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">No invoices yet.</li>
          )}
        </ul>
      )}
    </main>
  );
}