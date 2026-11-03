'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';

const CHORD_TIMEOUT_MS = 1000;
const CHORD_ROUTES: Record<string, string> = {
  p: '/projects',
  t: '/time',
  i: '/invoices',
};

function isEditable(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const chordRef = React.useRef<{ key: string; at: number } | null>(null);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      if (open) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable(document.activeElement)) return;

      const now = Date.now();
      const key = e.key.toLowerCase();

      if (chordRef.current && now - chordRef.current.at < CHORD_TIMEOUT_MS) {
        const first = chordRef.current.key;
        chordRef.current = null;

        if (first === 'g') {
          const target = CHORD_ROUTES[key];
          if (target) {
            e.preventDefault();
            router.push(target);
          }
        }
        return;
      }

      if (key === 'g') chordRef.current = { key: 'g', at: now };
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, router]);

  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => { setOpen(true); }}
        className="text-muted-foreground hidden gap-2 sm:inline-flex"
        aria-label="Open command palette"
      >
        <Search className="size-3.5" />
        <span>Search</span>
        <Kbd className="ml-2">⌘K</Kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search…" autoFocus />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => { go('/projects'); }}>
              Projects <CommandShortcut>G P</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => { go('/time'); }}>
              Time entries <CommandShortcut>G T</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => { go('/invoices'); }}>
              Invoices <CommandShortcut>G I</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}