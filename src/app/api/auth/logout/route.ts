import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { rootUrl } from "@/lib/auth/tenant-redirect";

export async function POST() {
  const response = NextResponse.json({ redirectTo: rootUrl("/login") });
  clearSessionCookie(response);
  return response;
}
