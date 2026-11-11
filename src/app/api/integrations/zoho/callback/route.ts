import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/db/prisma";
import { encryptSecret } from "@/lib/crypto/tokens";
import { zohoConfig } from "@/lib/zoho/config";
import { exchangeAuthCode, listZohoOrganizations } from "@/lib/zoho/client";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/settings?zoho=error&reason=${encodeURIComponent(error)}`, url.origin));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings?zoho=error&reason=missing_code", url.origin));
  }

  let tenantId: string;
  let userId: string;
  try {
    const { payload } = await jwtVerify(state, new TextEncoder().encode(process.env.AUTH_SECRET!));
    tenantId = String(payload.tenantId);
    userId = String(payload.userId);
  } catch {
    return NextResponse.redirect(new URL("/settings?zoho=error&reason=invalid_state", url.origin));
  }

  try {
    const cfg = zohoConfig();
    const tokens = await exchangeAuthCode({
      code,
      accountsBaseUrl: cfg.accountsBaseUrl,
      apiBaseUrl: cfg.apiBaseUrl,
    });
    if (!tokens.refreshToken) {
      return NextResponse.redirect(
        new URL("/settings?zoho=error&reason=missing_refresh_token", url.origin)
      );
    }

    const orgs = await listZohoOrganizations({
      accessToken: tokens.accessToken,
      apiBaseUrl: tokens.apiBaseUrl,
    });
    if (orgs.length === 0) {
      return NextResponse.redirect(new URL("/settings?zoho=error&reason=no_organization", url.origin));
    }

    const orgId = url.searchParams.get("organization_id") ?? orgs[0]!.organization_id;

    await prisma.zohoConnection.upsert({
      where: { tenantId },
      create: {
        tenantId,
        organizationId: orgId,
        accountsBaseUrl: cfg.accountsBaseUrl,
        apiBaseUrl: tokens.apiBaseUrl,
        accessTokenEnc: encryptSecret(tokens.accessToken),
        refreshTokenEnc: encryptSecret(tokens.refreshToken),
        expiresAt: tokens.expiresAt,
        connectedBy: userId,
      },
      update: {
        organizationId: orgId,
        accountsBaseUrl: cfg.accountsBaseUrl,
        apiBaseUrl: tokens.apiBaseUrl,
        accessTokenEnc: encryptSecret(tokens.accessToken),
        refreshTokenEnc: encryptSecret(tokens.refreshToken),
        expiresAt: tokens.expiresAt,
        connectedBy: userId,
        connectedAt: new Date(),
      },
    });

    return NextResponse.redirect(new URL("/settings?zoho=connected", url.origin));
  } catch (err) {
    const reason = err instanceof Error ? err.message : "connect_failed";
    return NextResponse.redirect(
      new URL(`/settings?zoho=error&reason=${encodeURIComponent(reason)}`, url.origin)
    );
  }
}
