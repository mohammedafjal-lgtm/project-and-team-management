/** Same-origin app URL (absolute when NEXT_PUBLIC_APP_URL is set). */
function appOrigin(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return base ?? "";
}

export function tenantUrl(_slug: string, path = "/dashboard"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const origin = appOrigin();
  return origin ? `${origin}${normalized}` : normalized;
}

export function rootUrl(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const origin = appOrigin();
  return origin ? `${origin}${normalized}` : normalized;
}
