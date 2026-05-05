/** Shimmer block — uses global `.ep-skeleton-shine` from `index.css`. */
export function SkeletonBox({ className = "", rounded = "md", style }) {
  const r = rounded === "full" ? "rounded-full" : rounded === "lg" ? "rounded-lg" : "rounded-md";
  return <div className={`ep-skeleton-shine ${r} ${className}`} style={style} aria-hidden />;
}
