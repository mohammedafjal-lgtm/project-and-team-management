"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RecordPaymentDialog } from "./record-payment-dialog";

export function InvoiceActions({
  id,
  status,
  totalCents,
  amountPaidCents,
  currency,
}: {
  id: string;
  status: string;
  totalCents: number;
  amountPaidCents: number;
  currency: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"send" | "void" | null>(null);
  const outstanding = totalCents - amountPaidCents;

  async function send() {
    setBusy("send");
    try {
      const res = await fetch(`/api/invoices/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to send");
      toast.success("Invoice sent");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function voidInvoice() {
    if (!confirm("Void this invoice? The journal entry will be reversed.")) return;
    setBusy("void");
    try {
      const res = await fetch(`/api/invoices/${id}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to void");
      toast.success("Invoice voided");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  const canVoid = status !== "PAID" && status !== "VOID";
  const canPay = status !== "DRAFT" && status !== "PAID" && status !== "VOID" && outstanding > 0;
  const isDraft = status === "DRAFT";

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" asChild>
        <a href={`/api/invoices/${id}/pdf`} target="_blank" rel="noopener noreferrer">PDF</a>
      </Button>
      {isDraft ? (
        <Button onClick={send} disabled={busy === "send"}>
          {busy === "send" ? "Sending…" : "Send invoice"}
        </Button>
      ) : null}
      {canPay ? (
        <RecordPaymentDialog
          invoiceId={id}
          outstandingCents={outstanding}
          currency={currency}
        />
      ) : null}
      {canVoid ? (
        <Button variant="outline" onClick={voidInvoice} disabled={busy === "void"}>
          {busy === "void" ? "Voiding…" : "Void"}
        </Button>
      ) : null}
    </div>
  );
}