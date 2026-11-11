import { prisma } from "@/lib/db/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto/tokens";
import { zohoConfig } from "./config";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  api_domain?: string;
};

export async function exchangeAuthCode(input: {
  code: string;
  accountsBaseUrl: string;
  apiBaseUrl?: string;
}) {
  const cfg = zohoConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: cfg.redirectUri,
    code: input.code,
  });

  const res = await fetch(`${input.accountsBaseUrl}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as TokenResponse & { error?: string };
  if (!res.ok || data.error) {
    throw new Error(data.error ?? "Failed to exchange Zoho auth code");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + (data.expires_in - 60) * 1000),
    apiBaseUrl: data.api_domain ?? input.apiBaseUrl ?? cfg.apiBaseUrl,
  };
}

async function refreshAccessToken(tenantId: string) {
  const connection = await prisma.zohoConnection.findUnique({ where: { tenantId } });
  if (!connection) throw new Error("Zoho Books is not connected");

  const cfg = zohoConfig();
  const refreshToken = decryptSecret(connection.refreshTokenEnc);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    refresh_token: refreshToken,
  });

  const res = await fetch(`${connection.accountsBaseUrl}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as TokenResponse & { error?: string };
  if (!res.ok || data.error || !data.access_token) {
    throw new Error(data.error ?? "Failed to refresh Zoho access token");
  }

  const expiresAt = new Date(Date.now() + (data.expires_in - 60) * 1000);
  await prisma.zohoConnection.update({
    where: { tenantId },
    data: {
      accessTokenEnc: encryptSecret(data.access_token),
      expiresAt,
      ...(data.api_domain ? { apiBaseUrl: data.api_domain } : {}),
    },
  });

  return {
    accessToken: data.access_token,
    organizationId: connection.organizationId,
    apiBaseUrl: data.api_domain ?? connection.apiBaseUrl,
  };
}

export async function getZohoAccess(tenantId: string) {
  const connection = await prisma.zohoConnection.findUnique({ where: { tenantId } });
  if (!connection) throw new Error("Zoho Books is not connected");

  if (connection.expiresAt.getTime() > Date.now() + 30_000) {
    return {
      accessToken: decryptSecret(connection.accessTokenEnc),
      organizationId: connection.organizationId,
      apiBaseUrl: connection.apiBaseUrl,
    };
  }
  return refreshAccessToken(tenantId);
}

export async function zohoFetch<T>(
  tenantId: string,
  path: string,
  init?: RequestInit & { query?: Record<string, string> }
): Promise<T> {
  const access = await getZohoAccess(tenantId);
  const url = new URL(`${access.apiBaseUrl}${path}`);
  url.searchParams.set("organization_id", access.organizationId);
  if (init?.query) {
    for (const [k, v] of Object.entries(init.query)) url.searchParams.set(k, v);
  }

  const { query: _q, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: {
      Authorization: `Zoho-oauthtoken ${access.accessToken}`,
      "Content-Type": "application/json",
      ...(rest.headers ?? {}),
    },
  });

  const data = await res.json();
  if (!res.ok || data.code !== 0) {
    throw new Error(data.message ?? `Zoho API error (${res.status})`);
  }
  return data as T;
}

export async function listZohoOrganizations(input: {
  accessToken: string;
  apiBaseUrl: string;
}) {
  const res = await fetch(`${input.apiBaseUrl}/books/v3/organizations`, {
    headers: { Authorization: `Zoho-oauthtoken ${input.accessToken}` },
  });
  const data = await res.json();
  if (!res.ok || data.code !== 0) {
    throw new Error(data.message ?? "Failed to list Zoho organizations");
  }
  return (data.organizations ?? []) as { organization_id: string; name: string }[];
}

export function centsToZohoAmount(cents: number) {
  return Number((cents / 100).toFixed(2));
}
