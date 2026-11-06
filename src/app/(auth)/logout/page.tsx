"use client";

import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    fetch("/api/auth/logout", { method: "POST" })
      .then((r) => r.json())
      .then((d) => { window.location.href = d.redirectTo; });
  }, []);
  return <div className="text-sm text-neutral-500">Signing out…</div>;
}