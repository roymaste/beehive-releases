import { cn } from "@/lib/utils"

// UX: Skeleton loading component — animated pulse placeholder for content loading states
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "bg-muted animate-pulse rounded-md",
        className
      )}
      {...props}
    />
  )
}

// UX: Table skeleton — multi-row placeholder for DataTable loading state
function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3 p-4">
      {/* Header skeleton */}
      <div className="flex gap-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-4 flex-1" style={{ maxWidth: i === 0 ? 60 : undefined }} />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`r-${r}`} className="flex gap-3 items-center">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={`c-${r}-${c}`}
              className="h-10 flex-1"
              style={{
                maxWidth: c === 0 ? 60 : undefined,
                animationDelay: `${r * 80 + c * 40}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// UX: Card skeleton — placeholder for stat cards and content cards
function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" style={{ animationDelay: `${i * 100}ms` }} />
      ))}
    </div>
  )
}

// UX: List skeleton — vertical list placeholder for sidebar/recent items
function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" style={{ animationDelay: `${i * 60}ms` }} />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/4" style={{ animationDelay: `${i * 60}ms` }} />
            <Skeleton className="h-2.5 w-1/2" style={{ animationDelay: `${i * 60 + 30}ms` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export { Skeleton, TableSkeleton, CardSkeleton, ListSkeleton }
