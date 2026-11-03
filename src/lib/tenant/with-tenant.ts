import { type NextRequest, NextResponse } from 'next/server';
import { type QueryFilter } from 'mongoose';
import { auth } from '@/lib/auth';
import { dbConnect } from '@/lib/db/mongoose';
import { Membership, type MembershipDoc } from '@/models/membership.model';
import { tenantStorage } from './tenant-context';
import { type MembershipRole } from '@/models/membership.model';

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: MembershipRole;
}

export function withTenant(
  handler: (req: NextRequest, ctx: TenantContext) => Promise<Response>,
) {
  return async (req: NextRequest) => {
    await dbConnect();

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const activeTenantId =
      (session.user as { activeTenantId?: string }).activeTenantId ?? '';

    if (!activeTenantId) {
      return NextResponse.json({ error: 'No active tenant' }, { status: 403 });
    }

    const filter: QueryFilter<MembershipDoc> = { userId, tenantId: activeTenantId };
    const membership = await Membership.findOne(filter).lean();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenantId = membership.tenantId;
    const role = membership.role;

    return tenantStorage.run({ tenantId }, () =>
      handler(req, { tenantId, userId, role }),
    );
  };
}