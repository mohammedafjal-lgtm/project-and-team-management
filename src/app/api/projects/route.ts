import { NextResponse } from "next/server";
import { z } from "zod";
import { ProjectRole, ProjectVisibility, Role } from "@prisma/client";
import { requireApiTenantContext } from "@/lib/tenancy/resolve";
import { hasRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { createProject, listProjects } from "@/domains/projects/project.repo";

const MemberBody = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(ProjectRole),
});

const Body = z.object({
  name: z.string().min(1).max(100),
  clientId: z.string().min(1),
  code: z.string().max(50).optional(),
  status: z.string().default("ACTIVE"),
  visibility: z.nativeEnum(ProjectVisibility).default(ProjectVisibility.PUBLIC),
  budgetType: z.enum(["NONE", "HOURS", "AMOUNT"]).default("NONE"),
  budgetMinutes: z.number().int().min(0).optional(),
  budgetCents: z.number().int().min(0).optional(),
  members: z.array(MemberBody).optional(),
});

export async function GET() {
  const ctx = await requireApiTenantContext();
  const projects = await listProjects(ctx);
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const ctx = await requireApiTenantContext();
  if (!hasRole(ctx.role, Role.MANAGER)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { clientId, code, status: _status, members, ...rest } = parsed.data;

  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: ctx.tenantId },
  });
  if (!client) {
    return NextResponse.json({ message: "Client not found" }, { status: 404 });
  }

  try {
    const project = await createProject(ctx, {
      ...rest,
      clientId,
      code,
      members,
    });
    return NextResponse.json(project);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to create project" },
      { status: 400 }
    );
  }
}
