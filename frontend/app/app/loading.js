import { DashboardSkeleton } from "@/components/ui/Skeleton";

/* Dashboard loading state — mirrors the real layout (greeting,
   stat tiles, continue-learning card, lesson list). */

export default function Loading() {
  return <DashboardSkeleton />;
}
