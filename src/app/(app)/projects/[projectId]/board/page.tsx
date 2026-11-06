import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenancy/resolve";
import { listTasks } from "@/domains/projects/task.repo";
import { prisma } from "@/lib/db/prisma";
import { ProjectBoard } from "@/components/projects/project-board";

export default async function BoardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await getTenantContext();
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId: ctx.tenantId },
    include: { client: true },
  });
  if (!project) redirect("/projects");
  const tasks = await listTasks(ctx, project.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-neutral-500 uppercase tracking-wider">{project.client.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
      </div>
      <ProjectBoard
        projectId={project.id}
        initialTasks={tasks.map((t) => ({ id: t.id, title: t.title, description: t.description ?? "", status: t.status }))}
      />
    </div>
  );
}