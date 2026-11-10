"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandShortcut, CommandSeparator,
} from "@/components/ui/command";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

type SearchResponse = {
  projects: { id: string; name: string }[];
  invoices: { id: string; number: string; client: { name: string } }[];
  clients: { id: string; name: string }[];
};

/** g-prefixed navigation: press "g" then one of these keys. */
const GOTO: Record<string, string> = {
  d: "/dashboard",
  c: "/clients",
  p: "/projects",
  t: "/time",
  i: "/invoices",
  b: "/bookkeeping",
};

/** How long the "g" prefix stays armed. */
const G_PREFIX_TTL_MS = 1000;

function clearPendingG(ref: React.MutableRefObject<number | null>) {
  if (ref.current !== null) {
    window.clearTimeout(ref.current);
    ref.current = null;
  }
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    function down(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      const typing =
        ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable;

      // ⌘K / Ctrl+K — toggle palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        clearPendingG(pendingG);
        setOpen((prev) => !prev);
        setQ("");
        return;
      }

      // "/" — open palette when not typing
      if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        clearPendingG(pendingG);
        setOpen(true);
        return;
      }

      // g-prefixed navigation
      if (typing || open) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // Second key of a "g <x>" sequence
      if (pendingG.current !== null) {
        clearPendingG(pendingG);

        // "g g" — re-arm the prefix so users can fumble without losing state
        if (key === "g") {
          pendingG.current = window.setTimeout(() => {
            pendingG.current = null;
          }, G_PREFIX_TTL_MS);
          return;
        }

        const target = GOTO[key];
        if (target) {
          e.preventDefault();
          router.push(target);
        }
        return;
      }

      // First "g" — arm the prefix
      if (key === "g") {
        pendingG.current = window.setTimeout(() => {
          pendingG.current = null;
        }, G_PREFIX_TTL_MS);
      }
    }

    document.addEventListener("keydown", down);
    return () => {
      document.removeEventListener("keydown", down);
      clearPendingG(pendingG);
    };
  }, [open, router]);

  const { data } = useQuery({
    queryKey: ["cmdk-search", q],
    queryFn: async () => (await api.get<SearchResponse>("/search", { params: { q } })).data,
    enabled: open && q.trim().length >= 2,
    staleTime: 10_000,
  });

  const go = (path: string) => {
    setOpen(false);
    setQ("");
    router.push(path);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setQ("");
      }}
      shouldFilter={!data}
    >
      <CommandInput placeholder="Search or run a command…" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {!data && (
          <>
            <CommandGroup heading="Navigate">
              <CommandItem onSelect={() => go("/dashboard")}>
                Dashboard <CommandShortcut>G D</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => go("/clients")}>
                Clients <CommandShortcut>G C</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => go("/projects")}>
                Projects <CommandShortcut>G P</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => go("/time")}>
                Time <CommandShortcut>G T</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => go("/invoices")}>
                Invoices <CommandShortcut>G I</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => go("/bookkeeping")}>
                Bookkeeping <CommandShortcut>G B</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => go("/clients/new")}>New client</CommandItem>
              <CommandItem onSelect={() => go("/projects/new")}>New project</CommandItem>
              <CommandItem onSelect={() => go("/invoices/new")}>New invoice</CommandItem>
              <CommandItem onSelect={() => go("/invoices/new/from-time")}>Bill from time</CommandItem>
              <CommandItem onSelect={() => go("/time")}>Log time</CommandItem>
            </CommandGroup>
          </>
        )}

        {data?.projects.length ? (
          <CommandGroup heading="Projects">
            {data.projects.map((p) => (
              <CommandItem key={p.id} onSelect={() => go(`/projects/${p.id}`)}>
                {p.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {data?.clients.length ? (
          <CommandGroup heading="Clients">
            {data.clients.map((c) => (
              <CommandItem key={c.id} onSelect={() => go(`/clients/${c.id}`)}>
                {c.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {data?.invoices.length ? (
          <CommandGroup heading="Invoices">
            {data.invoices.map((i) => (
              <CommandItem key={i.id} onSelect={() => go(`/invoices/${i.id}`)}>
                #{i.number} — {i.client.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}