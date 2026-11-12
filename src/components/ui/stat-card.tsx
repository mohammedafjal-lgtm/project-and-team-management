import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: "teal" | "green" | "red" | "orange" | "blue";
  hint?: string;
}

const colorMap = {
  teal: {
    border: "border-t-primary",
    icon: "bg-primary/10 text-primary",
  },
  green: {
    border: "border-t-emerald-500",
    icon: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  red: {
    border: "border-t-rose-500",
    icon: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
  orange: {
    border: "border-t-amber-500",
    icon: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  blue: {
    border: "border-t-sky-500",
    icon: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
};

export function StatCard({ label, value, icon: Icon, color = "teal", hint }: StatCardProps) {
  const tones = colorMap[color];
  return (
    <div
      className={cn(
        "rounded-2xl border-t-4 border-x border-b border-border/60 bg-card p-6 shadow-sm transition-all hover:shadow-md",
        tones.border
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <h3 className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</h3>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div className={cn("rounded-xl p-2.5", tones.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
