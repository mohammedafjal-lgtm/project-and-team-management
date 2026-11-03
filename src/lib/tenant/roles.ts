import type { MembershipRole } from '@/models/membership.model';

/** Can create/update domain records: projects, time entries, invoices. */
export const WRITE_ROLES = ['owner', 'admin', 'member'] as const satisfies readonly MembershipRole[];

/** Can manage membership + billing + destructive ops. */
export const ADMIN_ROLES = ['owner', 'admin'] as const satisfies readonly MembershipRole[];

/** Only the account owner (billing, deleting the workspace). */
export const OWNER_ROLES = ['owner'] as const satisfies readonly MembershipRole[];

export function isWriteRole(role: MembershipRole): boolean {
  return (WRITE_ROLES as readonly MembershipRole[]).includes(role);
}