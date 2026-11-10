"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function AcceptInviteForm({
  token,
  email,
  role,
  workspaceName,
}: {
  token: string;
  email: string;
  role: string;
  workspaceName: string;
}) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Could not accept invite");
      window.location.href = data.redirectTo;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not accept invite");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Join {workspaceName}</h1>
      <p className="text-sm text-neutral-500 mb-8">
        You were invited as <span className="font-medium text-neutral-700 dark:text-neutral-300">{role}</span>.
        Set your name and password to continue.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} disabled />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-neutral-500">At least 8 characters.</p>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Joining…" : "Accept invitation"}
        </Button>
      </form>
    </div>
  );
}
