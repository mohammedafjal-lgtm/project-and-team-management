"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function InvoiceActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    try {
      const res = await fetch(`/api/invoices/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to send");
      toast.success("Invoice sent");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" asChild>
        <a href={`/api/invoices/${id}/pdf`} target="_blank" rel="noopener noreferrer">PDF</a>
      </Button>
      {status === "DRAFT" && (
        <Button onClick={send} disabled={sending}>
          {sending ? "Sending…" : "Send invoice"}
        </Button>
      )}
    </div>
  );
}