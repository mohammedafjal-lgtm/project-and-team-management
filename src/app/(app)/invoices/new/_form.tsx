"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { allocateTax } from "@/domains/billing/tax";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormError, type FormErrors } from "@/components/ui/form-error";

type Client = { id: string; name: string; currency: string; taxRateBps: number };

type LineItem = {
  description: string;
  quantity: number;
  unitPriceStr: string;
};

type LineItemFieldErrors = {
  description?: string;
  quantity?: string;
  unitPriceStr?: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const invoiceSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  taxRateStr: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Must be a valid positive number"),
  lineItems: z
    .array(
      z.object({
        description: z.string().min(1, "Description is required"),
        quantity: z.number().min(1, "Quantity must be at least 1"),
        unitPriceStr: z
          .string()
          .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Rate must be positive"),
      })
    )
    .min(1, "At least one line item is required"),
});

export function NewInvoiceForm({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState(plusDays(30));
  const [taxRateStr, setTaxRateStr] = useState(() => {
    const bps = clients[0]?.taxRateBps ?? 0;
    return (bps / 100).toString();
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPriceStr: "" },
  ]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [lineItemErrors, setLineItemErrors] = useState<Record<number, LineItemFieldErrors>>({});

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
    setLineItemErrors((prev) => {
      const next = { ...prev };
      delete next[i];
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLineItemErrors({});

    const result = invoiceSchema.safeParse({
      clientId,
      issueDate,
      dueDate,
      taxRateStr,
      lineItems,
    });

    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);

      // Extract per-line-item errors properly from `issues`
      const itemErrors: Record<number, LineItemFieldErrors> = {};
      for (const issue of result.error.issues) {
        if (
          issue.path[0] === "lineItems" &&
          typeof issue.path[1] === "number" &&
          typeof issue.path[2] === "string"
        ) {
          const idx = issue.path[1];
          const field = issue.path[2] as keyof LineItemFieldErrors;
          itemErrors[idx] ??= {};
          itemErrors[idx][field] ??= issue.message;
        }
      }
      setLineItemErrors(itemErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ id: string }>("/invoices", {
        clientId,
        issueDate,
        dueDate,
        taxRateBps: Math.round((parseFloat(taxRateStr) || 0) * 100),
        lineItems: lineItems.map((l) => ({
          description: l.description.trim(),
          quantity: l.quantity,
          unitPriceCents: Math.round((parseFloat(l.unitPriceStr) || 0) * 100),
        })),
      });
      toast.success("Invoice drafted");
      router.push(`/invoices/${res.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create invoice");
      setLoading(false);
    }
  }

  const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);

  // Global error for the lineItems array itself (e.g. `.min(1)` failure)
  const lineItemsGlobalErr =
    errors.lineItems && errors.lineItems.length > 0 ? errors.lineItems[0] : undefined;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="client">Client</Label>
          <select
            id="client"
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              const bps = clients.find((c) => c.id === e.target.value)?.taxRateBps ?? 0;
              setTaxRateStr((bps / 100).toString());
            }}
            className={cn(
              "w-full h-10 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              errors.clientId && "border-destructive"
            )}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <FormError errors={errors} field="clientId" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="issueDate">Issue date</Label>
          <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          <FormError errors={errors} field="issueDate" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <FormError errors={errors} field="dueDate" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Line items</Label>
          <Button type="button" size="sm" variant="outline" onClick={addLine}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add line
          </Button>
        </div>
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium w-24 text-right">Qty</th>
                <th className="px-4 py-3 font-medium w-32 text-right">Rate</th>
                <th className="px-4 py-3 font-medium w-28 text-right">Amount</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lineItems.map((l, i) => {
                const amount =
                  Math.round((parseFloat(l.unitPriceStr) || 0) * 100) * (l.quantity || 0);
                const lineErr = lineItemErrors[i];
                return (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Input
                        placeholder="Design work — week 1"
                        value={l.description}
                        onChange={(e) => updateLine(i, { description: e.target.value })}
                        className={cn(lineErr?.description && "border-destructive")}
                      />
                      {lineErr?.description && (
                        <p className="text-xs text-destructive mt-1">{lineErr.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={l.quantity}
                        onChange={(e) => updateLine(i, { quantity: parseInt(e.target.value) || 1 })}
                        className={cn("text-right", lineErr?.quantity && "border-destructive")}
                      />
                      {lineErr?.quantity && (
                        <p className="text-xs text-destructive mt-1">{lineErr.quantity}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        value={l.unitPriceStr}
                        onChange={(e) => updateLine(i, { unitPriceStr: e.target.value })}
                        className={cn("text-right", lineErr?.unitPriceStr && "border-destructive")}
                      />
                      {lineErr?.unitPriceStr && (
                        <p className="text-xs text-destructive mt-1">{lineErr.unitPriceStr}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {fmt(amount)}
                    </td>
                    <td className="px-2 py-3">
                      {lineItems.length > 1 ? (
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => removeLine(i)}
                          aria-label="Remove line"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {lineItemsGlobalErr && (
          <p className="text-xs text-destructive font-medium">{lineItemsGlobalErr}</p>
        )}
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
            className={cn(errors.taxRateStr && "border-destructive")}
          />
          <FormError errors={errors} field="taxRateStr" />
          <p className="text-xs text-muted-foreground">
            Prefilled from the client&apos;s default tax rate.
          </p>
        </div>
        <div className="text-sm space-y-2 w-64 bg-muted/20 p-4 rounded-2xl border border-border">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{fmt(subtotalCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span className="tabular-nums">{fmt(taxCents)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t border-border pt-2 mt-2">
            <span>Total</span>
            <span className="tabular-nums">{fmt(totalCents)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-border">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save as draft"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}