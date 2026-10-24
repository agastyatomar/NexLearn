import { ListSkeleton } from "@/components/ui/Skeleton";

/* Leaderboard loading — podium + ranking rows skeleton. */

export default function Loading() {
  return (
    <div className="flex flex-col gap-5" role="status" aria-label="Loading leaderboard">
      <div className="skeleton mx-auto h-[24px] w-[45%]" />
      <div className="grid grid-cols-3 gap-3">
        <div className="skeleton h-[110px] rounded-[16px]" />
        <div className="skeleton h-[126px] rounded-[16px]" />
        <div className="skeleton h-[110px] rounded-[16px]" />
      </div>
      <ListSkeleton rows={6} height="h-[64px]" />
    </div>
  );
}
