"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { FormError, type FormErrors } from "@/components/ui/form-error";

const clientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  billingAddress: z.string().max(500, "Address is too long").optional(),
  currency: z.string().length(3, "Must be a 3-letter code (e.g. USD)"),
  defaultRate: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Rate must be a positive number",
  }),
  taxRate: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Tax rate must be a positive number",
  }),
});

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    billingAddress: "",
    currency: "USD",
    defaultRate: "",
    taxRate: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const centsFromDollars = (v: string) => Math.round((parseFloat(v) || 0) * 100);
  const bpsFromPercent = (v: string) => Math.round((parseFloat(v) || 0) * 100);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const result = clientSchema.safeParse(form);
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }

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
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New client</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Clients are the billable parties you invoice.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoFocus
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={cn(errors.name && "border-destructive focus-visible:ring-destructive/30")}
          />
          <FormError errors={errors} field="name" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email (optional)</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={cn(errors.email && "border-destructive focus-visible:ring-destructive/30")}
          />
          <FormError errors={errors} field="email" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="billingAddress">Billing address (optional)</Label>
          <Textarea
            id="billingAddress"
            rows={3}
            value={form.billingAddress}
            onChange={(e) => setForm({ ...form, billingAddress: e.target.value })}
            className={cn(errors.billingAddress && "border-destructive focus-visible:ring-destructive/30")}
          />
          <FormError errors={errors} field="billingAddress" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              maxLength={3}
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
              className={cn(errors.currency && "border-destructive focus-visible:ring-destructive/30")}
            />
            <FormError errors={errors} field="currency" />
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
              className={cn(errors.defaultRate && "border-destructive focus-visible:ring-destructive/30")}
            />
            <FormError errors={errors} field="defaultRate" />
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
              className={cn(errors.taxRate && "border-destructive focus-visible:ring-destructive/30")}
            />
            <FormError errors={errors} field="taxRate" />
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create client"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}