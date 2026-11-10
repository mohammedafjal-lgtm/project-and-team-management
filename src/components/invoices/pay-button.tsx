"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function PayButton({ token, amountLabel }: { token: string; amountLabel: string }) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/invoices/${token}/checkout`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed");
      if (!data.url) throw new Error("No checkout URL");
      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setLoading(false);
    }
  }

  return (
    <Button onClick={onClick} disabled={loading}>
      {loading ? "Redirecting…" : `Pay ${amountLabel}`}
    </Button>
  );
}