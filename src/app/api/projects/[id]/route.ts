import { NextResponse } from "next/server";
import { z } from "zod";
import { ProjectRole, ProjectVisibility } from "@prisma/client";
import { requireApiTenantContext } from "@/lib/tenancy/resolve";
import { ForbiddenError } from "@/lib/tenancy/context";
import { assertCanAccessProject, assertCanManageProject } from "@/domains/projects/project-access";
import { getProject, updateProject } from "@/domains/projects/project.repo";

const MemberBody = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(ProjectRole),
});

const PatchBody = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().max(50).nullable().optional(),
  status: z.string().optional(),
  visibility: z.nativeEnum(ProjectVisibility).optional(),
  budgetType: z.enum(["NONE", "HOURS", "AMOUNT"]).optional(),
  budgetMinutes: z.number().int().min(0).nullable().optional(),
  budgetCents: z.number().int().min(0).nullable().optional(),
  members: z.array(MemberBody).optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiTenantContext();
  const { id } = await params;
  try {
    await assertCanAccessProject(ctx, id);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ message: err.message }, { status: 403 });
    }
    throw err;
  }
  const project = await getProject(ctx, id);
  if (!project) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiTenantContext();
  const { id } = await params;
  const parsed = PatchBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await assertCanManageProject(ctx, id);
    const project = await updateProject(ctx, id, parsed.data);
    return NextResponse.json(project);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ message: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to update project" },
      { status: 400 }
    );
  }
}
