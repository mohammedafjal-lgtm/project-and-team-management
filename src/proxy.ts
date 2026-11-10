import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const SKIP_PREFIXES = [
  "/_next",
  "/api/webhooks",
  "/i/", // public invoice pages resolve by token and are host-agnostic
];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (SKIP_PREFIXES.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  const hostname = request.headers.get("host") || "";
  const requestHeaders = new Headers(request.headers);

  requestHeaders.delete("x-tenant-id");
  requestHeaders.delete("x-tenant-slug");

  const rootDomain = process.env.ROOT_DOMAIN ?? "localhost:3000";

  if (hostname === rootDomain || !hostname.endsWith(`.${rootDomain}`)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const subdomain = hostname.slice(0, -(rootDomain.length + 1));
  if (["www", "app", "admin"].includes(subdomain)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: subdomain },
    select: { id: true, slug: true },
  });

  if (!tenant) {
    return NextResponse.rewrite(new URL("/not-found", request.url), {
      request: { headers: requestHeaders },
    });
  }

  requestHeaders.set("x-tenant-id", tenant.id);
  requestHeaders.set("x-tenant-slug", tenant.slug);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};