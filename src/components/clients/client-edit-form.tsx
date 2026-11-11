"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type ClientDetails = {
  id: string;
  name: string;
  email: string | null;
  billingAddress: string | null;
  currency: string;
  defaultRateCents: number;
  taxRateBps: number;
};

function amount(cents: number) {
  return cents ? (cents / 100).toFixed(2) : "";
}

export function ClientEditForm({ client }: { client: ClientDetails }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: client.name,
    email: client.email ?? "",
    billingAddress: client.billingAddress ?? "",
    currency: client.currency,
    defaultRate: amount(client.defaultRateCents),
    taxRate: amount(client.taxRateBps),
  });

  const centsFromDollars = (v: string) => Math.round((parseFloat(v) || 0) * 100);
  const bpsFromPercent = (v: string) => Math.round((parseFloat(v) || 0) * 100);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch(`/clients/${client.id}`, {
        name: form.name.trim(),
        email: form.email.trim() || null,
        billingAddress: form.billingAddress.trim() || null,
        currency: form.currency.trim().toUpperCase(),
        defaultRateCents: centsFromDollars(form.defaultRate),
        taxRateBps: bpsFromPercent(form.taxRate),
      });
      toast.success("Client updated");
      router.push(`/clients/${client.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update client");
      setLoading(false);
    }
  }

  return (
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
            required
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
        <Button type="submit" disabled={loading || !form.name.trim() || form.currency.trim().length !== 3}>
          {loading ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push(`/clients/${client.id}`)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
