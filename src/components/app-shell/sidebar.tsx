"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, Clock, Receipt, BookOpen, Settings,
  ChevronsUpDown, LogOut, Users, Building2, Check, Plus,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const PRIMARY: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/team", label: "Team", icon: Users },
];

const FINANCE: NavItem[] = [
  { href: "/time", label: "Time", icon: Clock },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/bookkeeping", label: "Bookkeeping", icon: BookOpen },
];

export function Sidebar(props: {
  tenantName: string;
  tenantSlug: string;
  userEmail: string;
  tenants: { name: string; slug: string }[];
  canCreateWorkspace: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function switchWorkspace(slug: string) {
    if (slug === props.tenantSlug) return;
    const res = await fetch("/api/auth/switch-tenant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantSlug: slug }),
    });
    if (!res.ok) {
      toast.error("Could not switch workspace");
      return;
    }
    const data = (await res.json()) as { redirectTo?: string };
    router.push(data.redirectTo ?? "/dashboard");
    router.refresh();
  }

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to create workspace");
      toast.success("Workspace created");
      setCreateOpen(false);
      setName("");
      router.push(data.redirectTo ?? "/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function nav(items: NavItem[], heading: string) {
    return (
      <div className="mb-6">
        <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {heading}
        </p>
        <div className="space-y-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-primary/15"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      <aside className="fixed left-0 top-0 h-screen w-[260px] border-r border-border bg-sidebar flex flex-col">
        <div className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-2 h-12 rounded-xl hover:bg-secondary text-left transition-colors">
                <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground grid place-items-center text-sm font-bold shadow-sm">
                  {props.tenantName.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate leading-tight">{props.tenantName}</p>
                  <p className="text-xs text-muted-foreground truncate">{props.tenantSlug}</p>
                </div>
                <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[240px]">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
              {props.tenants.map((t) => (
                <DropdownMenuItem
                  key={t.slug}
                  onSelect={() => {
                    void switchWorkspace(t.slug);
                  }}
                  className="cursor-pointer"
                >
                  <span className="flex-1 truncate">{t.name}</span>
                  {t.slug === props.tenantSlug ? (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  ) : null}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {props.canCreateWorkspace ? (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setCreateOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create workspace
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem asChild className="cursor-pointer">
                <a href="/settings">Settings</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer text-destructive focus:text-destructive">
                <a href="/logout">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="px-4 pb-4 flex-1 overflow-auto">
          {nav(PRIMARY, "Work")}
          {nav(FINANCE, "Finance")}
        </div>

        <div className="p-4 border-t border-border mt-auto">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          <div className="px-3 mt-4">
            <p className="text-xs text-muted-foreground truncate">{props.userEmail}</p>
          </div>
        </div>
      </aside>

      {props.canCreateWorkspace ? (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create workspace</DialogTitle>
            </DialogHeader>
            <form onSubmit={createWorkspace} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="workspace-name">Name</Label>
                <Input
                  id="workspace-name"
                  autoFocus
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Studio"
                />
              </div>
              <Button type="submit" disabled={busy || name.trim().length < 2} className="w-full">
                {busy ? "Creating…" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}