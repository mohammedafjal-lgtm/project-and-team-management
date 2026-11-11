import { ProjectRole, Role } from "@prisma/client";

const RANK: Record<Role, number> = {
  OWNER: 100, ADMIN: 80, MANAGER: 60, MEMBER: 40, CLIENT: 20,
};

/** Roles the owner may assign via invite or role change (never OWNER). */
export const ASSIGNABLE_ROLES = [
  Role.ADMIN,
  Role.MANAGER,
  Role.MEMBER,
  Role.CLIENT,
] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export function isAssignableRole(role: Role): role is AssignableRole {
  return (ASSIGNABLE_ROLES as readonly Role[]).includes(role);
}

export function hasRole(userRole: Role, required: Role) {
  return RANK[userRole] >= RANK[required];
}

/** Only workspace OWNER may invite members and change roles. */
export function canManageTeam(role: Role) { return role === Role.OWNER; }

/** The seeded platform owner from OWNER_EMAIL (not every tenant Role.OWNER). */
export function isSeededOwner(email: string) {
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!ownerEmail) return false;
  return email.trim().toLowerCase() === ownerEmail;
}

/** Only the seeded OWNER may create additional workspaces. */
export function canCreateWorkspace(email: string) {
  return isSeededOwner(email);
}
export function canApproveTime(role: Role) { return hasRole(role, Role.MANAGER); }
export function canManageBilling(role: Role) { return hasRole(role, Role.ADMIN); }

/** Workspace OWNER/ADMIN can see every project including private ones. */
export function canViewAllProjects(role: Role) {
  return hasRole(role, Role.ADMIN);
}

/**
 * Project settings/members: workspace OWNER/ADMIN, or project-level ADMIN.
 * Workspace MANAGER+ can also manage when they have access (via canManage below).
 */
export function canManageProjectSettings(
  workspaceRole: Role,
  projectRole: ProjectRole | null
) {
  if (hasRole(workspaceRole, Role.ADMIN)) return true;
  return projectRole === ProjectRole.ADMIN;
}
