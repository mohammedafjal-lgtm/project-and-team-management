"use client";

import { useEffect, useState } from "react";
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

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();

  useEffect(() => {
    function down(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA"].includes(t.tagName) || t.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) {
          setOpen(false);
          setQ("");
        } else {
          setOpen(true);
        }
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open]);

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
              <CommandItem onSelect={() => go("/dashboard")}>Dashboard <CommandShortcut>G D</CommandShortcut></CommandItem>
              <CommandItem onSelect={() => go("/projects")}>Projects <CommandShortcut>G P</CommandShortcut></CommandItem>
              <CommandItem onSelect={() => go("/time")}>Time <CommandShortcut>G T</CommandShortcut></CommandItem>
              <CommandItem onSelect={() => go("/invoices")}>Invoices <CommandShortcut>G I</CommandShortcut></CommandItem>
              <CommandItem onSelect={() => go("/bookkeeping")}>Bookkeeping <CommandShortcut>G B</CommandShortcut></CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => go("/projects/new")}>New project</CommandItem>
              <CommandItem onSelect={() => go("/invoices/new")}>New invoice</CommandItem>
              <CommandItem onSelect={() => go("/time/new")}>Log time</CommandItem>
            </CommandGroup>
          </>
        )}

        {data?.projects.length ? (
          <CommandGroup heading="Projects">
            {data.projects.map((p) => (
              <CommandItem key={p.id} onSelect={() => go(`/projects/${p.id}`)}>{p.name}</CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {data?.clients.length ? (
          <CommandGroup heading="Clients">
            {data.clients.map((c) => (
              <CommandItem key={c.id} onSelect={() => go(`/clients/${c.id}`)}>{c.name}</CommandItem>
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