import { NextResponse } from 'next/server';
import { withTenant } from '@/lib/tenant/with-tenant';
import { Project } from '@/models/project.model';
import { createProjectSchema } from '@/lib/schemas/project';

export const GET = withTenant(async () => {
  const projects = await Project.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(projects);
});

export const POST = withTenant(async (req) => {
  const body: unknown = await req.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const project = new Project(parsed.data);
  await project.save();
  return NextResponse.json(project.toObject(), { status: 201 });
});