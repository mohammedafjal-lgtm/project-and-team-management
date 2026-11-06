"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, Clock, Receipt, BookOpen, Settings,
  ChevronsUpDown, LogOut, Users, Building2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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
}) {
  const pathname = usePathname();

  function nav(items: NavItem[], heading: string) {
    return (
      <div className="mb-4">
        <p className="px-3 mb-1 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
          {heading}
        </p>
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 px-3 h-8 rounded-md text-sm transition-colors",
                active
                  ? "bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-medium"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col">
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2 px-2 h-9 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900 text-left">
              <div className="w-6 h-6 rounded bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-900 grid place-items-center text-xs font-semibold">
                {props.tenantName.slice(0, 1).toUpperCase()}
              </div>
              <span className="flex-1 text-sm font-medium truncate">{props.tenantName}</span>
              <ChevronsUpDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-xs text-neutral-500">Workspaces</DropdownMenuLabel>
            {props.tenants.map((t) => (
              <DropdownMenuItem key={t.slug} asChild>
                <a href={`http://${t.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/dashboard`}>
                  {t.name}
                </a>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/settings">Settings</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/logout">
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="px-3 pb-3 flex-1 overflow-auto">
        {nav(PRIMARY, "Work")}
        {nav(FINANCE, "Finance")}
      </div>

      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
        <Link
          href="/settings"
          className="flex items-center gap-2 px-3 h-8 rounded-md text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        <p className="px-3 mt-2 text-xs text-neutral-500 truncate">{props.userEmail}</p>
      </div>
    </aside>
  );
}