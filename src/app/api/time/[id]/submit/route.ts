import { NextResponse } from "next/server";
import { requireApiTenantContext } from "@/lib/tenancy/resolve";
import { submitTimeEntry } from "@/domains/time/time.repo";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiTenantContext();
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