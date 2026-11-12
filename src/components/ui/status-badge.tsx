import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status =
  | "ACTIVE" | "DRAFT" | "SENT" | "VIEWED" | "PAID" | "PARTIALLY_PAID" | "OVERDUE" | "VOID"
  | "TODO" | "IN_PROGRESS" | "DONE"
  | "SUBMITTED" | "APPROVED" | "LOCKED" | "PUBLIC" | "PRIVATE";

const statusStyles: Record<string, string> = {
  // Positive
  ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  PAID: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  DONE: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",

  // Neutral / Pending
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  TODO: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  SUBMITTED: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",

  // Info / In Progress — brand teal
  SENT: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
  VIEWED: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
  IN_PROGRESS: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
  PUBLIC: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
  LOCKED: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",

  // Warning
  PARTIALLY_PAID: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",

  // Danger
  OVERDUE: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  VOID: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",

  // Privacy
  PRIVATE: "bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600",
};

export function StatusBadge({ status }: { status: Status | string }) {
  const style = statusStyles[status] || "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", style)}>
      {status}
    </Badge>
  );
}
