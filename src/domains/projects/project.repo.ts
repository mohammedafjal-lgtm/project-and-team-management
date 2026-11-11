import { ProjectRole, ProjectVisibility } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { TenantContext } from "@/lib/tenancy/context";
import { replaceProjectMembers, visibleProjectWhere } from "./project-access";

export async function listProjects(ctx: TenantContext) {
  return prisma.project.findMany({
    where: visibleProjectWhere(ctx),
    include: {
      client: true,
      _count: { select: { tasks: true, members: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getProject(ctx: TenantContext, projectId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, ...visibleProjectWhere(ctx) },
    include: {
      client: true,
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function createProject(
  ctx: TenantContext,
  input: {
    name: string;
    clientId: string;
    code?: string;
    budgetType?: string;
    budgetMinutes?: number;
    budgetCents?: number;
    visibility?: ProjectVisibility;
    members?: { userId: string; role: ProjectRole }[];
  }
) {
  const { members, visibility, code, ...rest } = input;
  const memberList = members?.length
    ? members
    : [{ userId: ctx.userId, role: ProjectRole.ADMIN }];

  const project = await prisma.project.create({
    data: {
      ...rest,
      code: code || null,
      visibility: visibility ?? ProjectVisibility.PUBLIC,
      tenantId: ctx.tenantId,
    },
  });

  await replaceProjectMembers(ctx, project.id, memberList);
  return getProject(ctx, project.id);
}

export async function updateProject(
  ctx: TenantContext,
  projectId: string,
  input: {
    name?: string;
    code?: string | null;
    status?: string;
    visibility?: ProjectVisibility;
    budgetType?: string;
    budgetMinutes?: number | null;
    budgetCents?: number | null;
    members?: { userId: string; role: ProjectRole }[];
  }
) {
  const { members, ...data } = input;
  await prisma.project.update({
    where: { id: projectId },
    data: {
      ...data,
      ...(data.code !== undefined ? { code: data.code || null } : {}),
    },
  });
  if (members) {
    await replaceProjectMembers(ctx, projectId, members);
  }
  return getProject(ctx, projectId);
}
