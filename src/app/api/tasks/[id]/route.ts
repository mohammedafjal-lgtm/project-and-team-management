import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiTenantContext } from "@/lib/tenancy/resolve";
import { ForbiddenError } from "@/lib/tenancy/context";
import { deleteTask, updateTask } from "@/domains/projects/task.repo";

const PatchBody = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  assigneeIds: z.array(z.string()).optional(),
  estimateMinutes: z.number().int().min(0).nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiTenantContext();
  const body = PatchBody.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ message: "Invalid input" }, { status: 400 });

  const { id } = await params;
  try {
    const updated = await updateTask(ctx, id, body.data);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ message: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "Failed";
    const status = message === "Task not found" ? 404 : 400;
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiTenantContext();
  const { id } = await params;
  try {
    await deleteTask(ctx, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ message: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "Failed";
    const status = message === "Task not found" ? 404 : 400;
    return NextResponse.json({ message }, { status });
  }
}
