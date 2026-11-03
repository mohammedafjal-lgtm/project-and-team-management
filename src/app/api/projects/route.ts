import { NextResponse } from 'next/server';
import { withTenant } from '@/lib/tenant/with-tenant';
import { WRITE_ROLES } from '@/lib/tenant/roles';
import { Project } from '@/models/project.model';
import { createProjectSchema } from '@/lib/schemas/project';

export const GET = withTenant(async () => {
  const projects = await Project.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(projects);
});

export const POST = withTenant(
  async (req, ctx) => {
    const body: unknown = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const project = new Project({
      ...parsed.data,
      tenantId: ctx.tenantId,
    });
    await project.save();
    return NextResponse.json(project.toObject(), { status: 201 });
  },
  { roles: WRITE_ROLES },
);
