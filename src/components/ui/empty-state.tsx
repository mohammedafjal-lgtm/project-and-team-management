import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center',
        className,
      )}
    >
      {Icon && <Icon className="text-muted-foreground size-8" strokeWidth={1.5} />}
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}