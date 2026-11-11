"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type ZohoInvoice = {
  invoice_id: string;
  invoice_number: string;
  status: string;
  total: number;
  date: string;
};

export function ZohoSyncDialog({
  invoiceId,
  zohoInvoiceId,
  zohoInvoiceNumber,
  connected,
  canManage,
}: {
  invoiceId: string;
  zohoInvoiceId: string | null;
  zohoInvoiceNumber: string | null;
  connected: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "update">(zohoInvoiceId ? "update" : "create");
  const [zohoId, setZohoId] = useState(zohoInvoiceId ?? "");
  const [remote, setRemote] = useState<ZohoInvoice[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !connected) return;
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      try {
        const res = await fetch(`/api/invoices/${invoiceId}/zoho`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Failed to load Zoho invoices");
        if (!cancelled) {
          setRemote(data.invoices ?? []);
          if (data.linkedZohoInvoiceId) {
            setZohoId(data.linkedZohoInvoiceId);
            setMode("update");
          }
        }
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Failed");
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, connected, invoiceId]);

  async function sync() {
    setBusy(true);
    try {
      const body =
        mode === "create"
          ? { mode: "create" as const }
          : { mode: "update" as const, zohoInvoiceId: zohoId };
      if (mode === "update" && !zohoId.trim()) {
        throw new Error("Select or enter a Zoho invoice to update");
      }
      const res = await fetch(`/api/invoices/${invoiceId}/zoho`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Sync failed");
      toast.success(
        mode === "create"
          ? `Created Zoho invoice ${data.zohoInvoiceNumber}`
          : `Updated Zoho invoice ${data.zohoInvoiceNumber}`
      );
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  if (!canManage) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={!connected} title={!connected ? "Connect Zoho Books in Settings" : undefined}>
          Sync with Zoho Books
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync with Zoho Books</DialogTitle>
        </DialogHeader>
        {!connected ? (
          <p className="text-sm text-neutral-500">
            Connect Zoho Books in Settings before syncing invoices.
          </p>
        ) : (
          <div className="space-y-4">
            {zohoInvoiceId ? (
              <p className="text-xs text-neutral-500">
                Currently linked to Zoho invoice {zohoInvoiceNumber ?? zohoInvoiceId}.
              </p>
            ) : null}

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={mode === "create"}
                  onChange={() => setMode("create")}
                />
                Create a new Zoho invoice
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={mode === "update"}
                  onChange={() => setMode("update")}
                />
                Update an existing Zoho invoice
              </label>
            </div>

            {mode === "update" ? (
              <div className="space-y-1.5">
                <Label>Zoho invoice</Label>
                {loadingList ? (
                  <p className="text-xs text-neutral-500">Loading invoices…</p>
                ) : (
                  <select
                    className="w-full h-9 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-2 text-sm"
                    value={zohoId}
                    onChange={(e) => setZohoId(e.target.value)}
                  >
                    <option value="">Select invoice…</option>
                    {remote.map((inv) => (
                      <option key={inv.invoice_id} value={inv.invoice_id}>
                        {inv.invoice_number} · {inv.status} · {inv.date}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  className="w-full h-9 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-2 text-sm"
                  placeholder="Or paste Zoho invoice ID"
                  value={zohoId}
                  onChange={(e) => setZohoId(e.target.value)}
                />
              </div>
            ) : null}

            <Button onClick={sync} disabled={busy} className="w-full">
              {busy ? "Syncing…" : mode === "create" ? "Create in Zoho Books" : "Update in Zoho Books"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
