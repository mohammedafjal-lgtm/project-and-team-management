import { NextResponse } from "next/server";
import { requireApiTenantContext } from "@/lib/tenancy/resolve";
import { canManageBilling } from "@/lib/auth/permissions";
import { ZOHO_SCOPES, zohoConfig, zohoConfigured } from "@/lib/zoho/config";
import { SignJWT } from "jose";

export async function GET() {
  if (!zohoConfigured()) {
    return NextResponse.json({ message: "Zoho Books is not configured on this server" }, { status: 503 });
  }

  const ctx = await requireApiTenantContext();
  if (!canManageBilling(ctx.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const cfg = zohoConfig();
  const state = await new SignJWT({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET!));

  const url = new URL(`${cfg.accountsBaseUrl}/oauth/v2/auth`);
  url.searchParams.set("scope", ZOHO_SCOPES);
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("redirect_uri", cfg.redirectUri);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
