import { Skeleton } from "@/components/ui/skeleton";

export default function SalesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-1 h-5 w-72" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="rounded-md border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
