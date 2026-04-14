/** Logo wordmark: green **e** (#1E9459) + saffron **Patri** (#FF9423). */
export default function BrandWordmark({ className = "text-4xl font-bold tracking-tight" }) {
  return (
    <span className={className} translate="no">
      <span className="text-[var(--brand-e)]">e</span>
      <span className="text-[var(--brand-patri)]">Patri</span>
    </span>
  );
}
