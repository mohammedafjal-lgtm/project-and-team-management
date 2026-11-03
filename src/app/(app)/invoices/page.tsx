'use client';

import { Receipt, Plus } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FieldError } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useActiveTenant } from '@/hooks/use-active-tenant';
import { useMembership } from '@/hooks/use-membership';
import { useCreateInvoice, useInvoices } from '@/hooks/use-invoices';

interface DraftLine {
  description: string;
  quantity: string;
  unitAmountRupees: string;
}

interface LineErrors {
  description?: string;
  quantity?: string;
  unitAmountRupees?: string;
}

const emptyLine = (): DraftLine => ({
  description: '',
  quantity: '1',
  unitAmountRupees: '',
});

const statusVariant: Record<
  string,
  'success' | 'warning' | 'muted' | 'destructive' | 'default'
> = {
  draft: 'muted',
  sent: 'warning',
  paid: 'success',
  void: 'destructive',
};

function inr(cents: number): string {
  return `₹${(cents / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function InvoicesPage() {
  const { activeTenantId } = useActiveTenant();
  const { canWrite } = useMembership(activeTenantId);
  const { data: invoices, isLoading } = useInvoices(activeTenantId);
  const createInvoice = useCreateInvoice(activeTenantId ?? '');

  const [clientName, setClientName] = useState('');
  const [clientError, setClientError] = useState<string | undefined>();
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [lineErrors, setLineErrors] = useState<Record<number, LineErrors>>({});

  function isLineEmpty(line: DraftLine): boolean {
    const qty = line.quantity.trim();
    return (
      !line.description.trim() &&
      !line.unitAmountRupees.trim() &&
      (qty === '' || qty === '1')
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground text-sm">
          Draft invoices from line items. Server recomputes totals — never trusts the client.
        </p>
      </header>

      {canWrite && (
        <form
          className="space-y-4 rounded-lg border p-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();

            const nextClientError = clientName.trim() ? undefined : 'Client name is required';
            setClientError(nextClientError);

            const nextLineErrors: Record<number, LineErrors> = {};
            const parsedLines: { description: string; quantity: number; unitAmountCents: number }[] =
              [];

            lines.forEach((line, i) => {
              if (isLineEmpty(line)) return;

              const errs: LineErrors = {};
              if (!line.description.trim()) errs.description = 'Required';

              const qty = Number(line.quantity);
              if (!Number.isFinite(qty) || qty <= 0) errs.quantity = 'Must be > 0';

              const amt = Number(line.unitAmountRupees);
              if (!Number.isFinite(amt) || amt < 0) errs.unitAmountRupees = 'Invalid amount';

              if (Object.keys(errs).length > 0) {
                nextLineErrors[i] = errs;
                return;
              }

              parsedLines.push({
                description: line.description.trim(),
                quantity: qty,
                unitAmountCents: Math.round(amt * 100),
              });
            });

            setLineErrors(nextLineErrors);

            if (nextClientError) return;
            if (Object.keys(nextLineErrors).length > 0) return;
            if (parsedLines.length === 0) {
              setLineErrors({ 0: { description: 'Add at least one line item' } });
              return;
            }

            createInvoice.mutate(
              { clientName: clientName.trim(), lines: parsedLines },
              {
                onSuccess: () => {
                  setClientName('');
                  setLines([emptyLine()]);
                  setLineErrors({});
                  setClientError(undefined);
                },
              },
            );
          }}
        >
          <div className="space-y-1">
            <Input
              value={clientName}
              onChange={(e) => {
                setClientName(e.target.value);
                if (clientError) setClientError(undefined);
              }}
              placeholder="Client name"
              aria-invalid={!!clientError}
              maxLength={200}
            />
            <FieldError error={clientError} />
          </div>

          <div className="space-y-2">
            {lines.map((line, i) => (
              <div key={i} className="space-y-1 rounded-md border p-3">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_7rem]">
                  <div className="space-y-1">
                    <Input
                      value={line.description}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLines((prev) =>
                          prev.map((x, j) => (j === i ? { ...x, description: v } : x)),
                        );
                        setLineErrors((prev) => {
                          if (!prev[i]?.description) return prev;
                          const copy = { ...prev };
                          const { description: _d, ...rest } = copy[i] ?? {};
                          copy[i] = rest;
                          return copy;
                        });
                      }}
                      placeholder="Description"
                      aria-invalid={!!lineErrors[i]?.description}
                      maxLength={200}
                    />
                    <FieldError error={lineErrors[i]?.description} />
                  </div>
                  <div className="space-y-1">
                    <Input
                      value={line.quantity}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLines((prev) =>
                          prev.map((x, j) => (j === i ? { ...x, quantity: v } : x)),
                        );
                        setLineErrors((prev) => {
                          if (!prev[i]?.quantity) return prev;
                          const copy = { ...prev };
                          const { quantity: _q, ...rest } = copy[i] ?? {};
                          copy[i] = rest;
                          return copy;
                        });
                      }}
                      placeholder="Qty"
                      inputMode="decimal"
                      aria-invalid={!!lineErrors[i]?.quantity}
                    />
                    <FieldError error={lineErrors[i]?.quantity} />
                  </div>
                  <div className="space-y-1">
                    <Input
                      value={line.unitAmountRupees}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLines((prev) =>
                          prev.map((x, j) =>
                            j === i ? { ...x, unitAmountRupees: v } : x,
                          ),
                        );
                        setLineErrors((prev) => {
                          if (!prev[i]?.unitAmountRupees) return prev;
                          const copy = { ...prev };
                          const { unitAmountRupees: _u, ...rest } = copy[i] ?? {};
                          copy[i] = rest;
                          return copy;
                        });
                      }}
                      placeholder="₹ each"
                      inputMode="decimal"
                      aria-invalid={!!lineErrors[i]?.unitAmountRupees}
                    />
                    <FieldError error={lineErrors[i]?.unitAmountRupees} />
                  </div>
                </div>
                <div className="text-muted-foreground flex items-center justify-between text-xs">
                  <span>
                    {Number.isFinite(Number(line.quantity)) &&
                    Number.isFinite(Number(line.unitAmountRupees))
                      ? `Line total: ₹${(
                          Number(line.quantity) * Number(line.unitAmountRupees)
                        ).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                      : null}
                  </span>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      className="text-destructive hover:underline"
                      onClick={() => {
                        setLines((prev) => prev.filter((_, j) => j !== i));
                        setLineErrors({});
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setLines((p) => [...p, emptyLine()]); }}
            >
              <Plus className="size-4" /> Add line
            </Button>
            <Button type="submit" disabled={createInvoice.isPending}>
              {createInvoice.isPending ? (
                <>
                  <Spinner /> Creating…
                </>
              ) : (
                'Create invoice'
              )}
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : invoices && invoices.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {invoices.map((inv) => (
            <li key={inv._id} className="flex items-center justify-between gap-4 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  #{inv.invoiceNumber} · {inv.clientName}
                </p>
                <p className="text-muted-foreground text-xs">
                  {inv.lines.length} line{inv.lines.length === 1 ? '' : 's'} ·{' '}
                  {new Date(inv.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium tabular-nums">
                  {inr(inv.totalCents)}
                </span>
                <Badge variant={statusVariant[inv.status] ?? 'default'}>
                  {inv.status}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description={
            canWrite
              ? 'Create your first invoice using the form above.'
              : 'Invoices created by your team will appear here.'
          }
        />
      )}
    </main>
  );
}