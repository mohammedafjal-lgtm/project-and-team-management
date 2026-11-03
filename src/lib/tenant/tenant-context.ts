import { AsyncLocalStorage } from 'node:async_hooks';

export const tenantStorage = new AsyncLocalStorage<{ tenantId: string }>();

export function getTenantId(): string {
  const ctx = tenantStorage.getStore();
  if (!ctx?.tenantId) throw new Error('No tenant context — failing closed');
  return ctx.tenantId;
}