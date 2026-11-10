"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function RecordPaymentDialog({
  invoiceId,
  outstandingCents,
  currency,
}: {
  invoiceId: string;
  outstandingCents: number;
  currency: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amountStr, setAmountStr] = useState((outstandingCents / 100).toFixed(2));
  const [reference, setReference] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amountCents = Math.round((parseFloat(amountStr) || 0) * 100);
    if (amountCents <= 0) {
      toast.error("Amount must be positive");
      return;
    }
    if (amountCents > outstandingCents) {
      toast.error("Amount exceeds outstanding balance");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents, method: "MANUAL", reference: reference || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed");
      toast.success("Payment recorded");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Record payment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount ({currency})</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={(outstandingCents / 100).toFixed(2)}
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-neutral-500">
              Outstanding: {(outstandingCents / 100).toFixed(2)} {currency}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reference">Reference (optional)</Label>
            <Input
              id="reference"
              placeholder="Check #, bank ref…"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Recording…" : "Record payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}