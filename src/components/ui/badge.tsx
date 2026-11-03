import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-secondary text-secondary-foreground border-transparent',
        outline: 'text-foreground border-border',
        success:
          'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400',
        warning:
          'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400',
        destructive: 'bg-destructive/10 text-destructive border-destructive/20',
        muted: 'bg-muted text-muted-foreground border-transparent',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}