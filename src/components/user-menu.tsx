'use client';

import { useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/auth-client';
import { useLogout } from '@/hooks/use-logout';

function getInitials(name?: string | null): string {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  const first = parts[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
  const initials = (first.slice(0, 1) + last.slice(0, 1)).toUpperCase();
  return initials || first.slice(0, 2).toUpperCase() || '?';
}

export function UserMenu() {
  const { data: session } = useSession();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const user = session?.user as { name?: string; email?: string } | undefined;
  const initials = getInitials(user?.name);

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => { setOpen((v) => !v); }}
        aria-label="Open account menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full text-xs font-semibold">
          {initials}
        </span>
      </Button>

      {open && (
        <div
          role="menu"
          className="bg-popover text-popover-foreground ring-foreground/10 absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-lg border p-1 shadow-md"
        >
          <div className="border-b px-2 py-2">
            <p className="truncate text-sm font-medium">{user?.name ?? 'Account'}</p>
            <p className="text-muted-foreground truncate text-xs">{user?.email ?? ''}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true);
              setOpen(false);
              void logout().finally(() => { setSigningOut(false); });
            }}
            className="hover:bg-muted mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm disabled:opacity-50"
          >
            <LogOut className="size-4" />
            <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
          </button>
        </div>
      )}
    </div>
  );
}