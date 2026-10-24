import { ListSkeleton } from "@/components/ui/Skeleton";

/* Community loading — thread cards skeleton. */

export default function Loading() {
  return (
    <div className="flex flex-col gap-5" role="status" aria-label="Loading community">
      <div className="skeleton h-[44px] w-full rounded-[12px]" />
      <ListSkeleton rows={5} height="h-[92px]" />
    </div>
  );
}
