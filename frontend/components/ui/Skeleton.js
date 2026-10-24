/* Skeleton primitives — pulse-shimmer placeholders for loading
   states (.skeleton sweep lives in globals.css). Compose into
   route-level loading.js files; keep shapes close to the real
   content to avoid layout shift. */

export function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5" role="status" aria-label="Loading dashboard">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-[26px] w-[46%]" />
        <Skeleton className="h-[14px] w-[64%]" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-[92px] rounded-[16px]" />
        <Skeleton className="h-[92px] rounded-[16px]" />
        <Skeleton className="h-[92px] rounded-[16px]" />
      </div>
      <Skeleton className="h-[120px] rounded-[16px]" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-[64px] rounded-[12px]" />
        <Skeleton className="h-[64px] rounded-[12px]" />
        <Skeleton className="h-[64px] rounded-[12px]" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 4, height = "h-[72px]" }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`${height} rounded-[12px]`} />
      ))}
    </div>
  );
}
