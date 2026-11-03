'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { refreshSession, useSession } from '@/lib/auth-client';
import { useTenants } from '@/hooks/use-tenants';
import { getQueryClient } from '@/lib/query-client';

export function TenantSwitcher() {
  const router = useRouter();
  const { data: session } = useSession();
  const activeTenantId = (session?.user as { activeTenantId?: string } | undefined)
    ?.activeTenantId;
  const { data: tenants } = useTenants();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
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

  const active = tenants?.find((t) => t._id === activeTenantId);

  async function switchTo(tenantId: string) {
    if (tenantId === activeTenantId) {
      setOpen(false);
      return;
    }
    setPending(tenantId);
    try {
      await api.post('/tenants/switch', { tenantId });
      await refreshSession();
      getQueryClient().clear();
      toast.success('Workspace switched');
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to switch workspace');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => { setOpen((v) => !v); }}
        className="gap-2"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Building2 className="size-3.5" />
        <span className="max-w-[9rem] truncate">
          {active?.name ?? 'Workspace'}
        </span>
        <ChevronsUpDown className="text-muted-foreground size-3.5" />
      </Button>

      {open && (
        <div
          role="listbox"
          className="bg-popover text-popover-foreground ring-foreground/10 absolute left-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border p-1 shadow-md"
        >
          <p className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
            Workspaces
          </p>
          {tenants && tenants.length > 0 ? (
            tenants.map((t) => (
              <button
                key={t._id}
                type="button"
                role="option"
                aria-selected={t._id === activeTenantId}
                disabled={pending === t._id}
                onClick={() => { void switchTo(t._id); }}
                className="hover:bg-muted flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm disabled:opacity-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{t.name}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {t.slug} · {t.plan}
                  </span>
                </span>
                {t._id === activeTenantId && (
                  <Check className="text-primary size-4 shrink-0" />
                )}
              </button>
            ))
          ) : (
            <p className="text-muted-foreground px-2 py-2 text-xs">No workspaces yet.</p>
          )}
        </div>
      )}
    </div>
  );
}