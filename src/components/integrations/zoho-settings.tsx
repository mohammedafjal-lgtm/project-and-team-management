"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ZohoSettings({
  configured,
  connected,
  organizationId,
  connectedAt,
  canManage,
}: {
  configured: boolean;
  connected: boolean;
  organizationId: string | null;
  connectedAt: string | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function disconnect() {
    if (!confirm("Disconnect Zoho Books from this workspace?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/integrations/zoho/disconnect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed");
      toast.success("Zoho Books disconnected");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">Zoho Books</h2>
        <p className="text-xs text-neutral-500 mt-1">
          Sync invoice lines, tax, currency, and recorded payments into Zoho Books.
        </p>
      </div>

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 bg-white dark:bg-neutral-950 space-y-3">
        {!configured ? (
          <p className="text-sm text-neutral-500">
            Zoho OAuth is not configured. Set <code className="text-xs">ZOHO_CLIENT_ID</code> and{" "}
            <code className="text-xs">ZOHO_CLIENT_SECRET</code> in the environment.
          </p>
        ) : connected ? (
          <>
            <p className="text-sm">
              Connected{organizationId ? ` · org ${organizationId}` : ""}
              {connectedAt ? (
                <span className="text-neutral-500">
                  {" "}
                  · since {new Date(connectedAt).toLocaleDateString()}
                </span>
              ) : null}
            </p>
            {canManage ? (
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <a href="/api/integrations/zoho/connect">Reconnect</a>
                </Button>
                <Button variant="outline" onClick={disconnect} disabled={busy}>
                  {busy ? "Disconnecting…" : "Disconnect"}
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-sm text-neutral-500">Not connected.</p>
            {canManage ? (
              <Button asChild>
                <a href="/api/integrations/zoho/connect">Connect Zoho Books</a>
              </Button>
            ) : (
              <p className="text-xs text-neutral-500">Ask a workspace admin to connect Zoho Books.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
