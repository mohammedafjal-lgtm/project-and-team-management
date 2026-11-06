import { Role } from "@prisma/client";

const RANK: Record<Role, number> = {
  OWNER: 100, ADMIN: 80, MANAGER: 60, MEMBER: 40, CLIENT: 20,
};

export function hasRole(userRole: Role, required: Role) {
  return RANK[userRole] >= RANK[required];
}

export function canManageTeam(role: Role) { return hasRole(role, Role.ADMIN); }
export function canApproveTime(role: Role) { return hasRole(role, Role.MANAGER); }
export function canManageBilling(role: Role) { return hasRole(role, Role.ADMIN); }