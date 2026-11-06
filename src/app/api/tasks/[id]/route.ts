import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { requireTenantContext } from "@/lib/tenancy/context";
import { updateTaskStatus } from "@/domains/projects/task.repo";

const Body = z.object({ status: z.enum(["TODO", "IN_PROGRESS", "DONE"]) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const h = await headers();
  const ctx = await requireTenantContext(h.get("x-tenant-id"));
  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  const { id } = await params;
  const task = await updateTaskStatus(ctx, id, body.data.status);
  return NextResponse.json(task);
}