"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProjectVisibility } from "@prisma/client";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ProjectMembersPicker,
  type ProjectMemberSelection,
  type TeamMemberOption,
} from "@/components/projects/project-members-picker";
import { toast } from "sonner";

export function ProjectSettings({
  projectId,
  visibility,
  members,
  team,
}: {
  projectId: string;
  visibility: ProjectVisibility;
  members: ProjectMemberSelection[];
  team: TeamMemberOption[];
}) {
  const router = useRouter();
  const [vis, setVis] = useState(visibility);
  const [memberList, setMemberList] = useState(members);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api.patch(`/projects/${projectId}`, {
        visibility: vis,
        members: memberList,
      });
      toast.success("Project settings saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-medium">Project access</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Control visibility and who can change this project&apos;s settings.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="project-visibility">Visibility</Label>
        <select
          id="project-visibility"
          value={vis}
          onChange={(e) => setVis(e.target.value as ProjectVisibility)}
          className="w-full h-9 rounded-md border border-border bg-card px-2 text-sm"
        >
          <option value={ProjectVisibility.PUBLIC}>Public — all workspace members</option>
          <option value={ProjectVisibility.PRIVATE}>Private — assigned members only</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>Members & roles</Label>
        <ProjectMembersPicker team={team} value={memberList} onChange={setMemberList} />
      </div>

      <Button onClick={save} disabled={busy}>
        {busy ? "Saving access…" : "Save access"}
      </Button>
    </section>
  );
}
