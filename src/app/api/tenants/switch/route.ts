import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/db/mongoose';
import { setUserActiveTenant } from '@/lib/tenant/set-active-tenant';
import { Membership } from '@/models/membership.model';

const switchSchema = z.object({ tenantId: z.string().min(1) });

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await getAuth();

  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = switchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { tenantId } = parsed.data;

  const membership = await Membership.findOne({
    userId: session.user.id,
    tenantId,
  }).lean();

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of that tenant' }, { status: 403 });
  }

  await setUserActiveTenant(session.user.id, tenantId);

  return NextResponse.json({ ok: true, tenantId });
}
