import { ListSkeleton } from "@/components/ui/Skeleton";

/* Learn-path loading — unit bands + lesson rows skeleton. */

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading learning path">
      {Array.from({ length: 3 }).map((_, u) => (
        <div key={u} className="flex flex-col gap-3 rounded-[16px] border-2 border-dim-steel bg-night p-4">
          <div className="flex items-center gap-3">
            <div className="skeleton h-10 w-10 rounded-[12px]" />
            <div className="skeleton h-[18px] w-[46%]" />
            <div className="skeleton ml-auto h-[22px] w-[56px] rounded-full" />
          </div>
          <ListSkeleton rows={3} height="h-[56px]" />
        </div>
      ))}
    </div>
  );
}
