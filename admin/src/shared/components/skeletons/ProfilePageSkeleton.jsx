import { SkeletonBox } from "./SkeletonBox";

export default function ProfilePageSkeleton() {
  return (
    <div className="ep-loading-fade-in mx-auto w-full max-w-3xl space-y-4 px-4 py-8 sm:px-6">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
        <SkeletonBox className="h-20 w-20 rounded-full" rounded="full" />
        <SkeletonBox className="h-5 w-48" />
        <SkeletonBox className="h-3 w-36" />
      </div>
      <div className="space-y-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
        <SkeletonBox className="h-4 w-28" />
        <SkeletonBox className="h-10 w-full" rounded="lg" />
        <SkeletonBox className="h-10 w-full" rounded="lg" />
      </div>
      <div className="space-y-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
        <SkeletonBox className="h-4 w-32" />
        <SkeletonBox className="h-24 w-full rounded-xl" rounded="lg" />
      </div>
    </div>
  );
}
