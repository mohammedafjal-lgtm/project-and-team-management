import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireTenantContext } from "@/lib/tenancy/context";
import { submitTimeEntry } from "@/domains/time/time.repo";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const h = await headers();
  const ctx = await requireTenantContext(h.get("x-tenant-id"));
  const { id } = await params;
  try {
    return NextResponse.json(await submitTimeEntry(ctx, id));
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}