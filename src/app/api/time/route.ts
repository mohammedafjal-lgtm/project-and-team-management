import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { requireTenantContext } from "@/lib/tenancy/context";
import { createTimeEntry, listTimeEntries } from "@/domains/time/time.repo";

const Body = z.object({
  projectId: z.string(),
  taskId: z.string().optional(),
  date: z.string(),
  durationMinutes: z.number().int().min(1).max(24 * 60),
  billable: z.boolean().default(true),
  rateCentsSnapshot: z.number().int().min(0),
  notes: z.string().optional(),
});

export async function GET() {
  const h = await headers();
  const ctx = await requireTenantContext(h.get("x-tenant-id"));
  const entries = await listTimeEntries(ctx);
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const h = await headers();
  const ctx = await requireTenantContext(h.get("x-tenant-id"));
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  const entry = await createTimeEntry(ctx, { ...parsed.data, date: new Date(parsed.data.date) });
  return NextResponse.json(entry);
}