import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { requireTenantContext } from "@/lib/tenancy/context";
import { createTask, listTasks } from "@/domains/projects/task.repo";

const Body = z.object({ title: z.string().min(1), description: z.string().optional() });

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const h = await headers();
  const ctx = await requireTenantContext(h.get("x-tenant-id"));
  const { id } = await params;
  const tasks = await listTasks(ctx, id);
  return NextResponse.json(tasks.map((t) => ({ id: t.id, title: t.title, description: t.description ?? "", status: t.status })));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const h = await headers();
  const ctx = await requireTenantContext(h.get("x-tenant-id"));
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ message: "Invalid input" }, { status: 400 });
  const { id } = await params;
  const task = await createTask(ctx, { projectId: id, ...parsed.data });
  return NextResponse.json(task);
}