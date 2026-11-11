import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiTenantContext } from "@/lib/tenancy/resolve";
import { updateTimeEntry, deleteTimeEntry } from "@/domains/time/time.repo";

const PatchBody = z.object({
  notes: z.string().max(2000).nullable().optional(),
  durationMinutes: z.number().int().min(1).max(24 * 60).optional(),
  date: z.string().optional(),
  billable: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiTenantContext();
  const { id } = await params;
  const parsed = PatchBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 400 });

  try {
    const data = { ...parsed.data, date: parsed.data.date ? new Date(parsed.data.date) : undefined };
    const entry = await updateTimeEntry(ctx, id, data);
    return NextResponse.json(entry);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiTenantContext();
  const { id } = await params;
  try {
    await deleteTimeEntry(ctx, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}