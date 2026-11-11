import Link from "next/link";
import { getTenantContext } from "@/lib/tenancy/resolve";
import { listProjects } from "@/domains/projects/project.repo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function ProjectsPage() {
  const ctx = await getTenantContext();
  const projects = await listProjects(ctx);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-neutral-500 mt-1">{projects.length} total</p>
        </div>
        <Button asChild><Link href="/projects/new">New project</Link></Button>
      </div>

      {projects.length === 0 ? (
        <div className="border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg p-12 text-center">
          <p className="font-medium">No projects yet</p>
          <p className="text-sm text-neutral-500 mt-1">Create your first project to start logging time.</p>
          <Button asChild className="mt-4"><Link href="/projects/new">New project</Link></Button>
        </div>
      ) : (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-950">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900 text-left text-xs text-neutral-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Client</th>
                <th className="px-4 py-2 font-medium">Visibility</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Tasks</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/60">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${p.id}/board`} className="font-medium hover:underline">{p.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{p.client.name}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{p.visibility}</Badge></td>
                  <td className="px-4 py-3"><Badge variant="outline">{p.status}</Badge></td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{p._count.tasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
