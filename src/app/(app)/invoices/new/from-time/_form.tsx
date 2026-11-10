"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Client = { id: string; name: string; currency: string; taxRateBps: number };

type Entry = {
  id: string;
  date: string;
  durationMinutes: number;
  rateCents: number;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  userName: string;
  notes: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export function FromTimeForm({ clients, entries }: { clients: Client[]; entries: Entry[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(entries.filter((e) => e.clientId === clients[0]?.id).map((e) => e.id)));
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState(plusDays(30));
  const client = clients.find((c) => c.id === clientId);
  const [taxRateStr, setTaxRateStr] = useState(
    client ? (client.taxRateBps / 100).toString() : "0"
  );

  const visibleEntries = useMemo(
    () => entries.filter((e) => e.clientId === clientId),
    [entries, clientId]
  );

  const totals = useMemo(() => {
    const chosen = visibleEntries.filter((e) => selected.has(e.id));
    const subtotalCents = chosen.reduce((s, e) => s + Math.round((e.durationMinutes * e.rateCents) / 60), 0);
    const taxBps = Math.round((parseFloat(taxRateStr) || 0) * 100);
    const taxCents = Math.round((subtotalCents * taxBps) / 10000);
    return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents, count: chosen.length };
  }, [visibleEntries, selected, taxRateStr]);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function changeClient(id: string) {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    setTaxRateStr(c ? (c.taxRateBps / 100).toString() : "0");
    setSelected(new Set(entries.filter((e) => e.clientId === id).map((e) => e.id)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (totals.count === 0) {
      toast.error("Select at least one time entry");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ id: string }>("/invoices/from-time", {
        timeEntryIds: [...selected].filter((id) => visibleEntries.some((e) => e.id === id)),
        issueDate,
        dueDate,
        taxRateBps: Math.round((parseFloat(taxRateStr) || 0) * 100),
      });
      toast.success("Invoice drafted from time");
      router.push(`/invoices/${res.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setLoading(false);
    }
  }

  const fmt = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: client?.currency ?? "USD" }).format(cents / 100);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="client">Client</Label>
          <select
            id="client"
            required
            value={clientId}
            onChange={(e) => changeClient(e.target.value)}
            className="w-full h-9 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-2 text-sm"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
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

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-950">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900 text-left text-xs text-neutral-500 uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2 w-8"></th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Project</th>
              <th className="px-3 py-2 font-medium">User</th>
              <th className="px-3 py-2 font-medium text-right">Hours</th>
              <th className="px-3 py-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {visibleEntries.map((e) => (
              <tr key={e.id} className="border-t border-neutral-200 dark:border-neutral-800">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    onChange={() => toggle(e.id)}
                  />
                </td>
                <td className="px-3 py-2">{new Date(e.date).toISOString().slice(0, 10)}</td>
                <td className="px-3 py-2">{e.projectName}</td>
                <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{e.userName}</td>
                <td className="px-3 py-2 text-right tabular-nums">{(e.durationMinutes / 60).toFixed(2)}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {fmt(Math.round((e.durationMinutes * e.rateCents) / 60))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
          <p className="text-xs text-neutral-500">
            Prefilled from the client&apos;s default tax rate.
          </p>
        </div>
        <div className="text-sm space-y-1 w-64">
          <div className="flex justify-between">
            <span className="text-neutral-500">Subtotal</span>
            <span className="tabular-nums">{fmt(totals.subtotalCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Tax</span>
            <span className="tabular-nums">{fmt(totals.taxCents)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t border-neutral-200 dark:border-neutral-800 pt-2 mt-1">
            <span>Total</span>
            <span className="tabular-nums">{fmt(totals.totalCents)}</span>
          </div>
          <p className="text-xs text-neutral-500 pt-1">{totals.count} entries selected</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading || totals.count === 0}>
          {loading ? "Drafting…" : "Draft invoice"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}