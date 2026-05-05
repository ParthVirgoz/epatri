import { SkeletonBox } from "./SkeletonBox";

/** Mimics admin shell (nav + main + tab bar) while session or route guard resolves. */
export default function AuthWorkspaceSkeleton({ caption = "Loading…" }) {
  return (
    <div className="ep-loading-fade-in flex min-h-dvh flex-col bg-[var(--app-bg)]">
      <header
        className="sticky top-0 z-20 flex h-[var(--nav-h)] shrink-0 items-center justify-center border-b border-neutral-200/90 bg-white/85 px-4 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <SkeletonBox className="h-8 w-28" rounded="lg" />
      </header>
      <main
        className="flex flex-1 flex-col gap-4 overflow-hidden px-4 py-5"
        style={{
          minHeight: "calc(100dvh - var(--nav-h) - var(--bottom-nav-h))",
          maxHeight: "calc(100dvh - var(--nav-h) - var(--bottom-nav-h))",
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBox className="h-6 w-40" />
            <SkeletonBox className="h-3 w-56 max-w-full" />
          </div>
          <SkeletonBox className="h-10 w-full sm:w-36" rounded="lg" />
        </div>
        <div className="grid flex-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm md:col-span-3 lg:col-span-3">
            <SkeletonBox className="h-4 w-24" />
            <SkeletonBox className="h-32 w-full rounded-xl" rounded="lg" />
            <SkeletonBox className="h-24 w-full rounded-xl" rounded="lg" />
          </div>
          <div className="hidden min-h-[200px] rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-sm md:block md:col-span-2 lg:col-span-2">
            <SkeletonBox className="mx-auto h-full min-h-[180px] w-[85%] max-w-[280px] rounded-xl" rounded="lg" />
          </div>
        </div>
        <p className="mt-auto text-center text-xs font-medium text-[#8e8e8e]">{caption}</p>
      </main>
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex h-[var(--bottom-nav-h)] items-center justify-around border-t border-neutral-200/90 bg-white/92 px-2 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-hidden
      >
        {[1, 2, 3].map((i) => (
          <SkeletonBox key={i} className="h-8 w-14" rounded="lg" />
        ))}
      </nav>
    </div>
  );
}
