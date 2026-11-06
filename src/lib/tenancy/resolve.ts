import { headers } from "next/headers";
import { requireTenantContext, TenantContext } from "./context";

export async function getTenantContext(): Promise<TenantContext> {
  const h = await headers();
  return requireTenantContext(h.get("x-tenant-id"));
}