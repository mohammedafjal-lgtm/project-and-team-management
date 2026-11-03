import { NextResponse } from 'next/server';
import { withTenant } from '@/lib/tenant/with-tenant';
import { WRITE_ROLES } from '@/lib/tenant/roles';
import { TimeEntry } from '@/models/time-entry.model';
import { createTimeEntrySchema } from '@/lib/schemas/time-entry';

export const GET = withTenant(async () => {
  const entries = await TimeEntry.find().sort({ startedAt: -1 }).lean();
  return NextResponse.json(entries);
});

export const POST = withTenant(
  async (req, ctx) => {
    const body: unknown = await req.json();
    const parsed = createTimeEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const entry = new TimeEntry({
      ...parsed.data,
      userId: ctx.userId,
      tenantId: ctx.tenantId,
    });
    await entry.save();
    return NextResponse.json(entry.toObject(), { status: 201 });
  },
  { roles: WRITE_ROLES },
);
