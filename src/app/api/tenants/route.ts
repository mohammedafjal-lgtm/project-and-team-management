import mongoose from 'mongoose';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/db/mongoose';
import { Tenant } from '@/models/tenant.model';
import { Membership } from '@/models/membership.model';
import { seedSystemAccounts } from '@/lib/services/tenant.service';

const createTenantSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers and dashes only'),
});

export async function POST(req: NextRequest) {
  await dbConnect();
  const auth = await getAuth();

  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = createTenantSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { name, slug } = parsed.data;

  const existing = await Tenant.findOne({ slug }).lean();
  if (existing) {
    return NextResponse.json({ error: 'Slug already taken' }, { status: 409 });
  }

  const tenant = await Tenant.create({ name, slug, plan: 'free' });
  const tenantId = String(tenant._id);

  await Membership.create({
    userId: session.user.id,
    tenantId,
    role: 'owner',
  });

  // Seed chart of accounts so the webhook can post balanced entries.
  await seedSystemAccounts(tenantId);

  // Flip the user's activeTenantId so withTenant accepts the next request.
  await mongoose.connection.collection('user').updateOne(
    { _id: new mongoose.Types.ObjectId(session.user.id) },
    { $set: { activeTenantId: tenantId } },
  );

  return NextResponse.json({ tenant: tenant.toObject() }, { status: 201 });
}