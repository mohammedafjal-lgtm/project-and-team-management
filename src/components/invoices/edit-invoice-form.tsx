"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { allocateTax } from "@/domains/billing/tax";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type Client = { id: string; name: string; currency: string; taxRateBps: number };

type LineItem = {
  description: string;
  quantity: number;
  unitPriceStr: string;
};

type Invoice = {
  id: string;
  clientId: string;
  issueDate: string;
  dueDate: string;
  taxRateBps: number;
  lockClient: boolean;
  lineItems: { description: string; quantity: number; unitPriceCents: number }[];
};

export function EditInvoiceForm({
  invoice,
  clients,
}: {
  invoice: Invoice;
  clients: Client[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [clientId, setClientId] = useState(invoice.clientId);
  const [issueDate, setIssueDate] = useState(invoice.issueDate.slice(0, 10));
  const [dueDate, setDueDate] = useState(invoice.dueDate.slice(0, 10));
  const [taxRateStr, setTaxRateStr] = useState((invoice.taxRateBps / 100).toString());
  const [lineItems, setLineItems] = useState<LineItem[]>(
    invoice.lineItems.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitPriceStr: (l.unitPriceCents / 100).toFixed(2),
    }))
  );

  const currency = clients.find((c) => c.id === clientId)?.currency ?? "USD";

  const { subtotalCents, taxCents, totalCents } = useMemo(() => {
    const amounts = lineItems.map((l) => ({
      amountCents:
        Math.round((parseFloat(l.unitPriceStr) || 0) * 100) * (l.quantity || 0),
    }));
    const taxRateBps = Math.round((parseFloat(taxRateStr) || 0) * 100);
    const alloc = allocateTax(amounts.length ? amounts : [{ amountCents: 0 }], taxRateBps);
    return {
      subtotalCents: alloc.netCents,
      taxCents: alloc.totalTaxCents,
      totalCents: alloc.grossCents,
    };
  }, [lineItems, taxRateStr]);

  function updateLine(i: number, patch: Partial<LineItem>) {
    setLineItems((items) => items.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  }

  function addLine() {
    setLineItems((items) => [...items, { description: "", quantity: 1, unitPriceStr: "" }]);
  }

  function removeLine(i: number) {
    setLineItems((items) => items.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validLines = lineItems.filter(
      (l) => l.description.trim() && (parseFloat(l.unitPriceStr) || 0) >= 0 && l.quantity > 0
    );
    if (validLines.length === 0) {
      toast.error("Add at least one line item");
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/invoices/${invoice.id}`, {
        clientId,
        issueDate,
        dueDate,
        taxRateBps: Math.round((parseFloat(taxRateStr) || 0) * 100),
        lineItems: validLines.map((l) => ({
          description: l.description.trim(),
          quantity: l.quantity,
          unitPriceCents: Math.round((parseFloat(l.unitPriceStr) || 0) * 100),
        })),
      });
      toast.success("Invoice updated");
      router.push(`/invoices/${invoice.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update invoice");
      setLoading(false);
    }
  }

  const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="client">Client</Label>
          <select
            id="client"
            required
            value={clientId}
            disabled={invoice.lockClient}
            onChange={(e) => {
              setClientId(e.target.value);
              const bps = clients.find((c) => c.id === e.target.value)?.taxRateBps ?? 0;
              setTaxRateStr((bps / 100).toString());
            }}
            className="w-full h-9 rounded-md border border-border bg-card px-2 text-sm disabled:opacity-60"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {invoice.lockClient ? (
            <p className="text-xs text-muted-foreground">
              Client is locked because this invoice is linked to time entries.
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="issueDate">Issue date</Label>
          <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Line items</Label>
          <Button type="button" size="sm" variant="ghost" onClick={addLine}>
            <Plus className="w-3.5 h-3.5" /> Add line
          </Button>
        </div>
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium w-24 text-right">Qty</th>
                <th className="px-3 py-2 font-medium w-32 text-right">Rate</th>
                <th className="px-3 py-2 font-medium w-28 text-right">Amount</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {lineItems.map((l, i) => {
                const amount = Math.round((parseFloat(l.unitPriceStr) || 0) * 100) * (l.quantity || 0);
                return (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2">
                      <Input
                        placeholder="Design work — week 1"
                        value={l.description}
                        onChange={(e) => updateLine(i, { description: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={l.quantity}
                        onChange={(e) => updateLine(i, { quantity: parseInt(e.target.value) || 1 })}
                        className="text-right"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        value={l.unitPriceStr}
                        onChange={(e) => updateLine(i, { unitPriceStr: e.target.value })}
                        className="text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {fmt(amount)}
                    </td>
                    <td className="px-1 py-2">
                      {lineItems.length > 1 ? (
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => removeLine(i)}
                          aria-label="Remove line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start justify-between gap-6">
        <div className="space-y-1.5 max-w-xs">
          <Label htmlFor="taxRate">Tax rate %</Label>
          <Input
            id="taxRate"
            type="number"
            min={0}
            step="0.01"
            value={taxRateStr}
            onChange={(e) => setTaxRateStr(e.target.value)}
          />
        </div>
        <div className="text-sm space-y-1 w-64">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{fmt(subtotalCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span className="tabular-nums">{fmt(taxCents)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t border-border pt-2 mt-1">
            <span>Total</span>
            <span className="tabular-nums">{fmt(totalCents)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push(`/invoices/${invoice.id}`)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
