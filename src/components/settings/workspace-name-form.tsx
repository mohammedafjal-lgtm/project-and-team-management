"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function WorkspaceNameForm({
  initialName,
  canEdit,
}: {
  initialName: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const dirty = name.trim() !== initialName.trim();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit || !dirty) return;
    setBusy(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to update name");
      toast.success("Workspace name updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <h2 className="text-sm font-medium">Workspace name</h2>
      <div className="space-y-1.5 max-w-sm">
        <Label htmlFor="workspace-name">Name</Label>
        <Input
          id="workspace-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canEdit || busy}
          minLength={2}
          maxLength={80}
          required
        />
      </div>
      {canEdit ? (
        <Button type="submit" disabled={busy || !dirty || name.trim().length < 2}>
          {busy ? "Saving…" : "Save name"}
        </Button>
      ) : (
        <p className="text-xs text-neutral-500">Only workspace admins can rename this workspace.</p>
      )}
    </form>
  );
}
