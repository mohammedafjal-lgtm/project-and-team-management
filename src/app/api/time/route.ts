import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiTenantContext } from "@/lib/tenancy/resolve";
import { ForbiddenError } from "@/lib/tenancy/context";
import { createTimeEntry, listTimeEntries } from "@/domains/time/time.repo";
import { assertCanAccessProject } from "@/domains/projects/project-access";
import { prisma } from "@/lib/db/prisma";

const Body = z.object({
  projectId: z.string(),
  taskId: z.string().optional(),
  date: z.string(),
  durationMinutes: z.number().int().min(1).max(24 * 60),
  billable: z.boolean().default(true),
  notes: z.string().optional(),
  // rateCentsSnapshot removed from client input; derived server-side
});

export async function GET() {
  const ctx = await requireApiTenantContext();
  const entries = await listTimeEntries(ctx);
  
  // Format the nested Prisma data into flat strings for the React component
  const formattedEntries = entries.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    durationMinutes: e.durationMinutes,
    billable: e.billable,
    status: e.status,
    projectName: e.project.name,
    userName: e.user.name ?? e.user.email,
    notes: e.notes,
  }));

  return NextResponse.json(formattedEntries);
}

export async function POST(req: Request) {
  const ctx = await requireApiTenantContext();
  const parsed = Body.safeParse(await req.json());
  
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }
  
  const { projectId, taskId, date, durationMinutes, billable, notes } = parsed.data;

  try {
    await assertCanAccessProject(ctx, projectId);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ message: err.message }, { status: 403 });
    }
    throw err;
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
    include: { client: { select: { defaultRateCents: true } } },
  });

  if (!project) {
    return NextResponse.json({ message: "Project not found" }, { status: 404 });
  }

  const entry = await createTimeEntry(ctx, {
    projectId,
    taskId,
    date: new Date(date),
    durationMinutes,
    billable,
    notes,
    rateCentsSnapshot: project.client.defaultRateCents,
  });

  return NextResponse.json(entry);
}