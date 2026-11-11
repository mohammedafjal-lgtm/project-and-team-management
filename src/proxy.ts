import { NextRequest, NextResponse } from "next/server";

/**
 * Strip client-supplied tenant headers so they cannot spoof workspace context.
 * Tenant is resolved from the session (activeTenantId), not the host.
 */
export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-tenant-id");
  requestHeaders.delete("x-tenant-slug");

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
