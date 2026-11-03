import { NextResponse } from 'next/server';
import { withTenant } from '@/lib/tenant/with-tenant';

/**
 * Returns the caller's membership for their active tenant. Used by the client
 * to decide whether to render write UI. `withTenant` already validated the
 * membership, so this is just a projection of the resolved context.
 */
export const GET = withTenant((_req, ctx) =>
  Promise.resolve(
    NextResponse.json({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      role: ctx.role,
    }),
  ),
);
