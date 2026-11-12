"use client";

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormError, type FormErrors } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const acceptSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200, "Password is too long"),
});

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
  const [errors, setErrors] = useState<FormErrors>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const result = acceptSchema.safeParse({ name, password });
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: result.data.name,
          password: result.data.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const fieldErrors = data.issues?.fieldErrors as FormErrors | undefined;
        if (fieldErrors && Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        } else {
          setErrors({ password: [data.message ?? "Could not accept invite"] });
        }
        setLoading(false);
        return;
      }
      window.location.href = data.redirectTo;
    } catch {
      setErrors({ password: ["Could not accept invite"] });
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Join {workspaceName}</h1>
      <p className="text-sm text-muted-foreground mb-8">
        You were invited as <span className="font-medium text-foreground/80">{role}</span>.
        Set your name and password to continue.
      </p>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} disabled />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(errors.name)}
            className={cn(errors.name && "border-destructive focus-visible:ring-destructive/30")}
          />
          <FormError errors={errors} field="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
            className={cn(errors.password && "border-destructive focus-visible:ring-destructive/30")}
          />
          <FormError errors={errors} field="password" />
          {!errors.password ? (
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          ) : null}
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "Joining…" : "Accept invitation"}
        </Button>
      </form>
    </div>
  );
}
