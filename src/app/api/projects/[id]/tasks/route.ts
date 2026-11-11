import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiTenantContext } from "@/lib/tenancy/resolve";
import { ForbiddenError } from "@/lib/tenancy/context";
import { createTask, listTasks } from "@/domains/projects/task.repo";

const Body = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  assigneeIds: z.array(z.string()).optional(),
  estimateMinutes: z.number().int().min(0).nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiTenantContext();
  const { id } = await params;
  try {
    const tasks = await listTasks(ctx, id);
    return NextResponse.json(tasks);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ message: err.message }, { status: 403 });
    }
    throw err;
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiTenantContext();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 400 });
  const { id } = await params;
  try {
    const task = await createTask(ctx, { projectId: id, ...parsed.data });
    return NextResponse.json(task);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ message: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to create task" },
      { status: 400 }
    );
  }
}
