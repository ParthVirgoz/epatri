/** Placeholder layout while the first insights API response loads. */
export default function InsightsDashboardSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6 ep-loading-fade-in">
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-6 w-28 rounded-md ep-skeleton-shine" />
          <div className="h-5 w-24 rounded-full ep-skeleton-shine opacity-90" />
          <div className="h-5 w-20 rounded-full ep-skeleton-shine opacity-90" />
        </div>
        <div className="mt-3 h-4 w-full max-w-lg rounded ep-skeleton-shine opacity-80" />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="h-10 w-36 rounded-full ep-skeleton-shine" />
        <div className="h-10 w-32 rounded-full ep-skeleton-shine" />
      </div>

      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
        <div className="h-3 w-24 rounded ep-skeleton-shine" />
        <div className="mt-3 flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-[5.5rem] rounded-full ep-skeleton-shine" style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm"
          >
            <div className="h-3 w-24 rounded ep-skeleton-shine" />
            <div className="mt-3 h-8 w-20 rounded-md ep-skeleton-shine" style={{ animationDelay: `${0.12 + i * 0.1}s` }} />
            <div className="mt-2 h-3 w-32 rounded ep-skeleton-shine opacity-80" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
        <div className="border-b border-[#efefef] px-4 py-3">
          <div className="h-3 w-48 rounded ep-skeleton-shine" />
        </div>
        <div className="px-3 py-4 sm:px-4">
          <div className="h-[200px] w-full rounded-lg ep-skeleton-shine sm:h-[220px]" />
        </div>
      </div>
    </div>
  );
}
