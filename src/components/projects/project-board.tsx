"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { TaskCard } from "@/components/projects/task-card";
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors,
  useDroppable, DragOverlay, DragStartEvent,
} from "@dnd-kit/core";

type Status = "TODO" | "IN_PROGRESS" | "DONE";
type Task = {
  id: string;
  title: string;
  description: string;
  status: string;
  assigneeIds: string[];
  estimateMinutes: number | null;
  dueDate: string | null;
};
type Member = { id: string; name: string | null; email: string };

const COLUMNS: { key: Status; label: string }[] = [
  { key: "TODO", label: "To do" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "DONE", label: "Done" },
];

function Column({ id, label, count, onAdd, children }: {
  id: Status; label: string; count: number; onAdd: () => void; children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border border-border bg-muted/40 p-3 min-h-[200px] flex flex-col gap-2 transition-colors ${
        isOver ? "ring-2 ring-primary/40" : ""
      }`}
    >
      <div className="flex items-center justify-between px-1 mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">{count}</span>
        </div>
        <button onClick={onAdd} className="text-muted-foreground hover:text-foreground">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

export function ProjectBoard({
  projectId,
  initialTasks,
  members,
}: {
  projectId: string;
  initialTasks: Task[];
  members: Member[];
}) {
  const qc = useQueryClient();
  const qKey = ["tasks", projectId];

  const { data: tasks = initialTasks } = useQuery<Task[]>({
    queryKey: qKey,
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/tasks`);
      return res.data;
    },
    initialData: initialTasks,
    staleTime: 10_000,
  });

  const [dragging, setDragging] = useState<Task | null>(null);
  const [adding, setAdding] = useState<Status | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    assigneeIds: [] as string[],
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      await api.patch(`/tasks/${id}`, { status });
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: qKey });
      const prev = qc.getQueryData<Task[]>(qKey) ?? [];
      qc.setQueryData<Task[]>(qKey, prev.map((t) => (t.id === id ? { ...t, status } : t)));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qKey, ctx.prev);
      toast.error("Could not move task");
    },
    onSuccess: () => toast.success("Task moved"),
  });

  const add = useMutation({
    mutationFn: async ({ title, status }: { status: Status; title: string }) => {
      const res = await api.post(`/projects/${projectId}/tasks`, { title, status });
      return res.data as Task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qKey });
      setAdding(null);
      setNewTitle("");
      toast.success("Task created");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      await api.patch(`/tasks/${editing.id}`, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        assigneeIds: editForm.assigneeIds,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qKey });
      setEditing(null);
      toast.success("Task updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  function openEdit(task: Task) {
    setEditing(task);
    setEditForm({
      title: task.title,
      description: task.description,
      assigneeIds: [...task.assigneeIds],
    });
  }

  function toggleAssignee(userId: string) {
    setEditForm((prev) => ({
      ...prev,
      assigneeIds: prev.assigneeIds.includes(userId)
        ? prev.assigneeIds.filter((id) => id !== userId)
        : [...prev.assigneeIds, userId],
    }));
  }

  function onDragStart(e: DragStartEvent) {
    setDragging(tasks.find((t) => t.id === e.active.id) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const id = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;
    if (!["TODO", "IN_PROGRESS", "DONE"].includes(overId)) return;
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === overId) return;
    move.mutate({ id, status: overId as Status });
  }

  return (
    <>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => {
            const items = tasks.filter((t) => t.status === col.key);
            return (
              <Column
                key={col.key}
                id={col.key}
                label={col.label}
                count={items.length}
                onAdd={() => setAdding(col.key)}
              >
                {items.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    members={members}
                    onOpen={() => openEdit(t)}
                  />
                ))}

                {adding === col.key ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); if (newTitle.trim()) add.mutate({ status: col.key, title: newTitle }); }}
                    className="space-y-2"
                  >
                    <Input autoFocus placeholder="Task title…" value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Escape") { setAdding(null); setNewTitle(""); } }} />
                    <div className="flex gap-2">
                      <Button size="sm" type="submit" disabled={!newTitle.trim() || add.isPending}>Add</Button>
                      <Button size="sm" variant="ghost" type="button" onClick={() => { setAdding(null); setNewTitle(""); }}>Cancel</Button>
                    </div>
                  </form>
                ) : null}
              </Column>
            );
          })}
        </div>
        <DragOverlay>
          {dragging ? (
            <div className="rounded-md border border-border bg-card p-3 shadow-lg text-sm">
              {dragging.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Assignees</Label>
              <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-auto">
                {members.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.assigneeIds.includes(m.id)}
                      onChange={() => toggleAssignee(m.id)}
                    />
                    <span className="truncate">{m.name ?? m.email}</span>
                    {!memberById.has(m.id) ? null : null}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Double-click a card to edit assignees.</p>
            </div>
            <Button
              onClick={() => saveEdit.mutate()}
              disabled={!editForm.title.trim() || saveEdit.isPending}
              className="w-full"
            >
              {saveEdit.isPending ? "Saving…" : "Save task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
