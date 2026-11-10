import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { requireTenantContext } from "@/lib/tenancy/context";
import { prisma } from "@/lib/db/prisma";

const PatchBody = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  assigneeIds: z.array(z.string()).optional(),
  estimateMinutes: z.number().int().min(0).nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const h = await headers();
  const ctx = await requireTenantContext(h.get("x-tenant-id"));
  const body = PatchBody.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ message: "Invalid input" }, { status: 400 });

  const { id } = await params;
  const task = await prisma.task.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!task) return NextResponse.json({ message: "Task not found" }, { status: 404 });

  const { dueDate, ...rest } = body.data;
  const updated = await prisma.task.update({
    where: { id },
    data: { ...rest, ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }) },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const h = await headers();
  const ctx = await requireTenantContext(h.get("x-tenant-id"));
  const { id } = await params;
  const task = await prisma.task.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!task) return NextResponse.json({ message: "Task not found" }, { status: 404 });
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}