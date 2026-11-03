import { Skeleton } from '@/components/ui/skeleton';

export default function AppLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <Skeleton className="h-8 w-40" />
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}