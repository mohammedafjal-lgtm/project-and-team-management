"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { ZohoSyncDialog } from "./zoho-sync-dialog";

export function InvoiceActions({
  id,
  status,
  totalCents,
  amountPaidCents,
  currency,
  zohoInvoiceId,
  zohoInvoiceNumber,
  zohoConnected,
  canManageBilling,
}: {
  id: string;
  status: string;
  totalCents: number;
  amountPaidCents: number;
  currency: string;
  zohoInvoiceId: string | null;
  zohoInvoiceNumber: string | null;
  zohoConnected: boolean;
  canManageBilling: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"send" | "void" | null>(null);
  const [voidOpen, setVoidOpen] = useState(false);
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
      setVoidOpen(false);
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
      {status !== "VOID" ? (
        <ZohoSyncDialog
          invoiceId={id}
          zohoInvoiceId={zohoInvoiceId}
          zohoInvoiceNumber={zohoInvoiceNumber}
          connected={zohoConnected}
          canManage={canManageBilling}
        />
      ) : null}
      {canVoid ? (
        <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={busy === "void"}>
              Void
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Void invoice?</DialogTitle>
              <DialogDescription>
                This cannot be undone. The journal entry will be reversed and the invoice will be marked void.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setVoidOpen(false)}
                disabled={busy === "void"}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={voidInvoice}
                disabled={busy === "void"}
              >
                {busy === "void" ? "Voiding…" : "Void invoice"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
