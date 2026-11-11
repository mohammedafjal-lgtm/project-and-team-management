import { ProjectRole, ProjectVisibility, Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { TenantContext, ForbiddenError } from "@/lib/tenancy/context";
import { canManageProjectSettings, canViewAllProjects } from "@/lib/auth/permissions";

export async function getProjectMembership(
  ctx: TenantContext,
  projectId: string
): Promise<{ role: ProjectRole } | null> {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: ctx.userId } },
    select: { role: true },
  });
}

export function visibleProjectWhere(ctx: TenantContext) {
  if (canViewAllProjects(ctx.role)) {
    return { tenantId: ctx.tenantId };
  }
  return {
    tenantId: ctx.tenantId,
    OR: [
      { visibility: ProjectVisibility.PUBLIC },
      { members: { some: { userId: ctx.userId } } },
    ],
  };
}

export async function assertCanAccessProject(ctx: TenantContext, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...visibleProjectWhere(ctx) },
    select: {
      id: true,
      visibility: true,
      members: { where: { userId: ctx.userId }, select: { role: true } },
    },
  });
  if (!project) throw new ForbiddenError("Project not found or access denied");
  return {
    projectId: project.id,
    visibility: project.visibility,
    projectRole: project.members[0]?.role ?? null,
  };
}

export async function assertCanManageProject(ctx: TenantContext, projectId: string) {
  const access = await assertCanAccessProject(ctx, projectId);
  if (!canManageProjectSettings(ctx.role, access.projectRole)) {
    throw new ForbiddenError("Cannot manage project settings");
  }
  return access;
}

export async function validateAssigneeIds(
  ctx: TenantContext,
  projectId: string,
  assigneeIds: string[]
) {
  if (assigneeIds.length === 0) return;
  const unique = [...new Set(assigneeIds)];
  const members = await prisma.membership.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: "ACTIVE",
      userId: { in: unique },
    },
    select: { userId: true },
  });
  if (members.length !== unique.length) {
    throw new Error("One or more assignees are not active workspace members");
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
    select: { visibility: true },
  });
  if (project?.visibility === ProjectVisibility.PRIVATE && !canViewAllProjects(ctx.role)) {
    const projectMembers = await prisma.projectMember.findMany({
      where: { projectId, userId: { in: unique } },
      select: { userId: true },
    });
    if (projectMembers.length !== unique.length) {
      throw new Error("Assignees on private projects must be project members");
    }
  }
}

export async function replaceProjectMembers(
  ctx: TenantContext,
  projectId: string,
  members: { userId: string; role: ProjectRole }[]
) {
  const uniqueUserIds = [...new Set(members.map((m) => m.userId))];
  if (uniqueUserIds.length !== members.length) {
    throw new Error("Duplicate project members");
  }

  if (uniqueUserIds.length > 0) {
    const active = await prisma.membership.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: "ACTIVE",
        userId: { in: uniqueUserIds },
        role: { not: Role.CLIENT },
      },
      select: { userId: true },
    });
    if (active.length !== uniqueUserIds.length) {
      throw new Error("All project members must be active non-client workspace members");
    }
  }

  await prisma.$transaction([
    prisma.projectMember.deleteMany({
      where: { tenantId: ctx.tenantId, projectId },
    }),
    ...(members.length
      ? [
          prisma.projectMember.createMany({
            data: members.map((m) => ({
              tenantId: ctx.tenantId,
              projectId,
              userId: m.userId,
              role: m.role,
            })),
          }),
        ]
      : []),
  ]);
}
