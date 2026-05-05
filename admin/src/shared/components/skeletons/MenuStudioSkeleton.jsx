import { SkeletonBox } from "./SkeletonBox";

/** Matches Menu studio two-column layout while `/menu/mine` loads. */
export default function MenuStudioSkeleton() {
  return (
    <div className="ep-loading-fade-in flex h-[calc(100dvh-var(--nav-h)-var(--bottom-nav-h))] max-h-[calc(100dvh-var(--nav-h)-var(--bottom-nav-h))] w-full flex-col gap-4 overflow-hidden md:grid md:grid-cols-2 lg:grid-cols-5 xl:grid-cols-3 md:overflow-hidden">
      <section className="flex min-h-0 flex-col gap-4 border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-4 shadow-sm sm:p-4 md:col-span-1 lg:col-span-3 xl:col-span-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <SkeletonBox className="h-6 w-36" />
            <SkeletonBox className="h-3 w-44" />
          </div>
          <SkeletonBox className="h-10 w-full sm:w-32" rounded="lg" />
        </div>
        <div className="flex gap-2">
          <SkeletonBox className="h-10 flex-1" rounded="lg" />
          <SkeletonBox className="h-10 flex-1" rounded="lg" />
        </div>
        <SkeletonBox className="min-h-[200px] w-full flex-1 rounded-xl" rounded="lg" />
      </section>
      <section className="hidden min-h-0 flex-col border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm md:col-span-1 lg:col-span-2 xl:col-span-1 md:flex">
        <div className="border-b border-neutral-200 px-3 py-2">
          <SkeletonBox className="h-3 w-20" />
        </div>
        <div className="min-h-0 flex-1 bg-[var(--app-bg)] p-3">
          <SkeletonBox className="mx-auto h-full min-h-[280px] w-full max-w-[300px] rounded-xl" rounded="lg" />
        </div>
      </section>
    </div>
  );
}
