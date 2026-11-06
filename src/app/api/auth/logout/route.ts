import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";
import { rootUrl } from "@/lib/auth/tenant-redirect";

export async function POST() {
  await destroySession();
  return NextResponse.json({ redirectTo: rootUrl("/login") });
}