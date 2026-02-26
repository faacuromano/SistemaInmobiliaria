import { Skeleton } from "@/components/ui/skeleton";

export default function EstadisticasLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4 border-l-4 border-cyan-600 pl-4">
        <Skeleton className="h-12 w-12 rounded-sm" />
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-1 h-5 w-72" />
        </div>
      </div>

      {/* Period filters */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-52" />
      </div>

      {/* Monthly income table */}
      <div className="rounded-sm border p-6 space-y-4">
        <Skeleton className="h-6 w-64" />
        <div className="space-y-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Sales Summary + Collection Performance */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-sm border p-6 space-y-4">
          <Skeleton className="h-6 w-56" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20 rounded-sm" />
            <Skeleton className="h-20 rounded-sm" />
            <Skeleton className="h-20 rounded-sm col-span-2" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        </div>
        <div className="rounded-sm border p-6 space-y-4">
          <Skeleton className="h-6 w-64" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20 rounded-sm" />
            <Skeleton className="h-20 rounded-sm" />
            <Skeleton className="h-20 rounded-sm" />
            <Skeleton className="h-20 rounded-sm" />
          </div>
          <Skeleton className="h-16 rounded-sm" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>

      {/* Year-over-Year */}
      <div className="rounded-sm border p-6 space-y-4">
        <Skeleton className="h-6 w-72" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
