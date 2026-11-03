import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/db/mongoose';
import { Membership, type MembershipRole } from '@/models/membership.model';
import { tenantStorage } from './tenant-context';

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: MembershipRole;
}

interface WithTenantOptions {
  /**
   * If provided, the request is rejected with 403 unless the caller's role
   * is in this list. Omit for "any authenticated member of the active tenant".
   */
  roles?: readonly MembershipRole[];
}

export function withTenant(
  handler: (req: NextRequest, ctx: TenantContext) => Promise<Response>,
  options: WithTenantOptions = {},
) {
  return async (req: NextRequest) => {
    await dbConnect();
    const auth = await getAuth();

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const activeTenantId = (session.user as { activeTenantId?: string }).activeTenantId ?? '';

    if (!activeTenantId) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    // Membership intentionally has NO tenantPlugin — this lookup runs before
    // any tenant context exists. Every other model enforces scoping via plugin.
    const membership = await Membership.findOne({
      userId,
      tenantId: activeTenantId,
    }).lean();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenantId = membership.tenantId;
    const role = membership.role;

    if (options.roles && !options.roles.includes(role)) {
      return NextResponse.json(
        { error: `Requires one of: ${options.roles.join(', ')}` },
        { status: 403 },
      );
    }

    return tenantStorage.run({ tenantId }, () => handler(req, { tenantId, userId, role }));
  };
}
