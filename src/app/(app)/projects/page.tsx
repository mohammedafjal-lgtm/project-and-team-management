import Link from "next/link";
import { getTenantContext } from "@/lib/tenancy/resolve";
import { listProjects } from "@/domains/projects/project.repo";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function ProjectsPage() {
  const ctx = await getTenantContext();
  const projects = await listProjects(ctx);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">{projects.length} total</p>
        </div>
        <Button asChild><Link href="/projects/new">New project</Link></Button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center">
          <p className="font-medium">No projects yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first project to start logging time.</p>
          <Button asChild className="mt-4"><Link href="/projects/new">New project</Link></Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Visibility</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/projects/${p.id}/board`} className="font-medium hover:underline">{p.name}</Link>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{p.client.name}</td>
                  <td className="px-6 py-4"><StatusBadge status={p.visibility} /></td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-4 text-right tabular-nums">{p._count.tasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}