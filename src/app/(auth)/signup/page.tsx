"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SignupPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", tenantName: "" });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Signup failed");
      window.location.href = data.redirectTo;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Create your workspace</h1>
      <p className="text-sm text-neutral-500 mb-8">
        Start managing projects, time, and billing in minutes.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" autoFocus required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" minLength={8} required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <p className="text-xs text-neutral-500">At least 8 characters.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tenantName">Workspace name</Label>
          <Input id="tenantName" required value={form.tenantName}
            onChange={(e) => setForm({ ...form, tenantName: e.target.value })} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating…" : "Create workspace"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-neutral-500 text-center">
        Already have an account?{" "}
        <Link href="/login" className="underline underline-offset-4 hover:text-neutral-900 dark:hover:text-neutral-100">
          Sign in
        </Link>
      </p>
    </div>
  );
}