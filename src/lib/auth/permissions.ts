import { Role } from "@prisma/client";

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

/** Only the seeded OWNER may invite members and change roles. */
export function canManageTeam(role: Role) { return role === Role.OWNER; }
export function canApproveTime(role: Role) { return hasRole(role, Role.MANAGER); }
export function canManageBilling(role: Role) { return hasRole(role, Role.ADMIN); }