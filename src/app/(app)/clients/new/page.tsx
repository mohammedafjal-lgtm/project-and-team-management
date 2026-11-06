"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    billingAddress: "",
    currency: "USD",
    defaultRate: "", // dollars per hour, converted to cents on submit
    taxRate: "",     // percent, converted to bps on submit
  });

  const centsFromDollars = (v: string) => Math.round((parseFloat(v) || 0) * 100);
  const bpsFromPercent = (v: string) => Math.round((parseFloat(v) || 0) * 100);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<{ id: string }>("/clients", {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        billingAddress: form.billingAddress.trim() || undefined,
        currency: form.currency,
        defaultRateCents: centsFromDollars(form.defaultRate),
        taxRateBps: bpsFromPercent(form.taxRate),
      });
      toast.success("Client created");
      router.push(`/clients/${res.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create client");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New client</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Clients are the billable parties you invoice.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoFocus
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email (optional)</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="billingAddress">Billing address (optional)</Label>
          <Textarea
            id="billingAddress"
            rows={3}
            value={form.billingAddress}
            onChange={(e) => setForm({ ...form, billingAddress: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              maxLength={3}
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="defaultRate">Default rate / hr</Label>
            <Input
              id="defaultRate"
              type="number"
              min={0}
              step="0.01"
              placeholder="150.00"
              value={form.defaultRate}
              onChange={(e) => setForm({ ...form, defaultRate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="taxRate">Tax rate %</Label>
            <Input
              id="taxRate"
              type="number"
              min={0}
              step="0.01"
              placeholder="8.25"
              value={form.taxRate}
              onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={loading || !form.name.trim()}>
            {loading ? "Creating…" : "Create client"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}