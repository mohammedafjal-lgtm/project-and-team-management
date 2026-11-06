"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

export function TaskCard({ task }: { task: { id: string; title: string; description: string } }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 shadow-sm text-sm cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <p className="font-medium leading-tight">{task.title}</p>
      {task.description ? (
        <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{task.description}</p>
      ) : null}
    </div>
  );
}