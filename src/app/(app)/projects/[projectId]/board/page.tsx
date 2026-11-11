import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenancy/resolve";
import { listTasks } from "@/domains/projects/task.repo";
import { getProject } from "@/domains/projects/project.repo";
import { prisma } from "@/lib/db/prisma";
import { ProjectBoard } from "@/components/projects/project-board";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function BoardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await getTenantContext();
  const project = await getProject(ctx, projectId);
  if (!project) redirect("/projects");
  const [tasks, memberships] = await Promise.all([
    listTasks(ctx, project.id),
    prisma.membership.findMany({
      where: { tenantId: ctx.tenantId, status: "ACTIVE" },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const members =
    project.visibility === "PRIVATE"
      ? memberships
          .filter((m) =>
            project.members.some((pm) => pm.userId === m.user.id) ||
            m.role === "OWNER" ||
            m.role === "ADMIN"
          )
          .map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email }))
      : memberships.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider">{project.client.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <div className="mt-2 flex gap-2">
            <Badge variant="outline">{project.visibility}</Badge>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/projects/${project.id}`}>Project settings</Link>
            </Button>
          </div>
        </div>
      </div>
      <ProjectBoard projectId={project.id} initialTasks={tasks} members={members} />
    </div>
  );
}
