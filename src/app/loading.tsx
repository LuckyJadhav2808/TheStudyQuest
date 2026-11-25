import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="flex h-dvh w-full flex-col gap-4 p-4 sm:p-6">
      <Skeleton className="h-14 w-full rounded-2xl" />
      <div className="grid flex-1 gap-4 lg:grid-cols-12">
        <Skeleton className="h-full rounded-[28px] lg:col-span-4" />
        <Skeleton className="h-full rounded-[28px] lg:col-span-8" />
      </div>
    </div>
  );
}
