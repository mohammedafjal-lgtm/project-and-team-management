import { env } from "@/lib/env";

export function zohoConfigured() {
  const e = env();
  return Boolean(e.ZOHO_CLIENT_ID && e.ZOHO_CLIENT_SECRET);
}

export function zohoConfig() {
  const e = env();
  if (!e.ZOHO_CLIENT_ID || !e.ZOHO_CLIENT_SECRET) {
    throw new Error("Zoho Books is not configured");
  }
  const appUrl = e.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    clientId: e.ZOHO_CLIENT_ID,
    clientSecret: e.ZOHO_CLIENT_SECRET,
    redirectUri: e.ZOHO_REDIRECT_URI ?? `${appUrl}/api/integrations/zoho/callback`,
    accountsBaseUrl: (e.ZOHO_ACCOUNTS_URL ?? "https://accounts.zoho.com").replace(/\/$/, ""),
    apiBaseUrl: (e.ZOHO_API_BASE_URL ?? "https://www.zohoapis.com").replace(/\/$/, ""),
  };
}

export const ZOHO_SCOPES = [
  "ZohoBooks.invoices.CREATE",
  "ZohoBooks.invoices.UPDATE",
  "ZohoBooks.invoices.READ",
  "ZohoBooks.contacts.CREATE",
  "ZohoBooks.contacts.READ",
  "ZohoBooks.contacts.UPDATE",
  "ZohoBooks.settings.READ",
  "ZohoBooks.customerpayments.CREATE",
  "ZohoBooks.customerpayments.READ",
].join(",");
