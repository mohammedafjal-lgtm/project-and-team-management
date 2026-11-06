export function tenantUrl(slug: string, path = "/dashboard"): string {
    const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
    const proto = process.env.NODE_ENV === "production" ? "https" : "http";
    return `${proto}://${slug}.${root}${path}`;
  }
  
  export function rootUrl(path = "/"): string {
    const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
    const proto = process.env.NODE_ENV === "production" ? "https" : "http";
    return `${proto}://${root}${path}`;
  }