"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

type Member = { id: string; name: string | null; email: string };

function initials(m: Member) {
  const label = (m.name ?? m.email).trim();
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase();
  return label.slice(0, 2).toUpperCase();
}

export function TaskCard({
  task,
  members,
  onOpen,
}: {
  task: {
    id: string;
    title: string;
    description: string;
    assigneeIds: string[];
  };
  members: Member[];
  onOpen?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const assignees = task.assigneeIds
    .map((id) => members.find((m) => m.id === id))
    .filter((m): m is Member => Boolean(m));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={onOpen}
      className={`rounded-md border border-border bg-card p-3 shadow-sm text-sm cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <p className="font-medium leading-tight">{task.title}</p>
      {task.description ? (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
      ) : null}
      {assignees.length > 0 ? (
        <div className="mt-2 flex -space-x-1.5">
          {assignees.slice(0, 4).map((m) => (
            <span
              key={m.id}
              title={m.name ?? m.email}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-card bg-muted text-[10px] font-medium"
            >
              {initials(m)}
            </span>
          ))}
          {assignees.length > 4 ? (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-card bg-muted text-[10px] text-muted-foreground">
              +{assignees.length - 4}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
