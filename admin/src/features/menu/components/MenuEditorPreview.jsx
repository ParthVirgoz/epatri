import { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import PdfCanvasPreview from "../../../components/PdfCanvasPreview";
import { INTERACTIVE_THEME_DEFAULTS } from "../menuUiSettings";

const descClampStyle = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

function MenuItemDescription({ text, color }) {
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const pRef = useRef(null);

  useLayoutEffect(() => {
    const el = pRef.current;
    const id = requestAnimationFrame(() => {
      if (!el || !text) {
        setShowToggle(false);
        return;
      }
      if (expanded) {
        setShowToggle(true);
        return;
      }
      setShowToggle(el.scrollHeight > el.clientHeight + 1);
    });
    return () => cancelAnimationFrame(id);
  }, [text, expanded]);

  if (!text) return null;

  return (
    <div className="mt-1.5">
      <p
        ref={pRef}
        className="text-[12px] leading-snug [overflow-wrap:anywhere] [word-break:break-word] [hyphens:auto]"
        style={{
          color,
          opacity: 0.72,
          ...(expanded ? {} : descClampStyle),
        }}
      >
        {text}
      </p>
      {showToggle ? (
        <button
          type="button"
          className="mt-1 cursor-pointer border-0 bg-transparent p-0 text-[11px] font-semibold underline underline-offset-2"
          style={{ color, opacity: 0.88 }}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Hide" : "More"}
        </button>
      ) : null}
    </div>
  );
}

function normalizeDigital(dm) {
  const cats = Array.isArray(dm?.categories) ? dm.categories : [];
  return cats.map((c) => ({
    name: String(c?.name || "").trim(),
    items: Array.isArray(c?.items)
      ? c.items.map((i) => ({
        name: String(i?.name || "").trim(),
        description: String(i?.description || "").trim(),
        price: i?.price != null && i?.price !== "" ? String(i.price) : "",
      }))
      : [],
  }));
}

function StatusBar() {
  return (
    <div className="flex h-8 shrink-0 items-center justify-between bg-white px-4 pt-1 text-[11px] font-semibold tracking-tight text-[#0a0a0a]">
      <span>9:41</span>
      <div className="flex items-center gap-1" aria-hidden>
        <svg className="h-2.5 w-3 text-[#0a0a0a]" viewBox="0 0 12 10" fill="currentColor" aria-hidden>
          <path d="M1 7h2v2H1V7zm3-2h2v4H4V5zm3-2h2v6H7V3zm3-2h2v8h-2V1z" />
        </svg>
        <svg className="h-2.5 w-4 text-[#0a0a0a]" viewBox="0 0 16 10" fill="currentColor" aria-hidden>
          <path d="M2 3h12v5H2V3zm13 2.5a2.5 2.5 0 01-2.5 2.5h-9A2.5 2.5 0 012 5.5 2.5 2.5 0 014.5 3h7A2.5 2.5 0 0114 5.5z" opacity=".35" />
          <path d="M2 3h12v5H2z" />
        </svg>
      </div>
    </div>
  );
}

/**
 * In-admin phone mockup: updates from editor state (unsaved PDF / digital menu).
 */
export default function MenuEditorPreview({
  businessName,
  format,
  pdfUrl,
  pdfFile,
  pdfVersion = 0,
  digitalMenu,
  interactiveTheme,
  showMobilePreview = false,
}) {
  const categories = normalizeDigital(digitalMenu);
  const hasInteractive = categories.some((c) => c.name || c.items.some((i) => i.name || i.description || i.price));
  const hasPdf = Boolean(pdfUrl || pdfFile);
  const showPdf = format === "pdf" && hasPdf;
  const showInteractive = format === "interactive" && (hasInteractive || !hasPdf);
  const pdfEmpty = format === "pdf" && !hasPdf;
  const t = interactiveTheme && typeof interactiveTheme === "object" ? interactiveTheme : {};
  const d = INTERACTIVE_THEME_DEFAULTS;
  const surface = String(t.surface || d.surface);
  const menuCardColor = String(t.menuCardColor || t.cardColor || d.menuCardColor);
  const brandNameColor = String(t.brandNameColor || t.accent || d.brandNameColor);
  const itemsColor = String(t.itemsColor || t.bodyTextColor || d.itemsColor);
  const categoryColor = String(t.categoryColor || t.categoryTextColor || d.categoryColor);
  const priceColor = String(t.priceColor || t.priceTextColor || d.priceColor);
  const currencySymbol = String(t.currencySymbol || d.currencySymbol).trim() || d.currencySymbol;
  const previewGroups = categories.filter((c) => c.name || (c.items || []).some((i) => i.name || i.description || i.price));
  const fontFamily = '"Inter", system-ui, sans-serif';

  const formatPrice = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    return `${currencySymbol} ${raw}`;
  };

  const previewBody = (
    <div
      className={`hide-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain ${showInteractive ? "" : "bg-white"}`}
    >
      {showPdf ? (
        <div className="bg-[#f2f2f2] p-1.5">
          <PdfCanvasPreview phonePreview url={pdfFile ? undefined : pdfUrl} file={pdfFile || undefined} version={pdfVersion} className="" />
        </div>
      ) : pdfEmpty ? (
        <div className="flex min-h-[200px] items-center px-5 py-10 text-center">
          <p className="text-[13px] leading-relaxed text-[#737373]">Upload a PDF in the editor — it appears here instantly.</p>
        </div>
      ) : showInteractive ? (
        <div className="min-h-full" style={{ background: surface, fontFamily: fontFamily }}>
          <div className="min-h-full px-4 pb-10 pt-8" style={{ background: menuCardColor, maxWidth: "100%" }}>
            <h1
              className="text-center text-xl font-bold leading-tight [overflow-wrap:anywhere] [word-break:break-word] [hyphens:auto] mb-5"
              style={{ color: brandNameColor }}
            >
              {businessName || "Your business"}
            </h1>
            {previewGroups.length === 0 ? (
              <p className="py-8 text-center text-[12px]" style={{ color: itemsColor, opacity: 0.55 }}>
                No sections yet — add categories in the editor.
              </p>
            ) : (
              previewGroups.map((cat, ci) => (
                <section key={ci}>
                  <h2
                    className="mb-2.5 text-[20px] font-bold uppercase tracking-[0.03em] [overflow-wrap:anywhere] [word-break:break-word] [hyphens:auto]"
                    style={{ color: categoryColor }}
                  >
                    {cat.name || `Section ${ci + 1}`}
                  </h2>
                  <ul className="m-0 list-none p-0">
                    {(cat.items || []).filter((item) => item.name || item.description || item.price).map((item, ii) => (
                      <li key={ii} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "10px 0" }}>
                        <div className="flex items-baseline justify-between gap-2.5">
                          <div className="min-w-0 flex-1">
                            {item.name ? (
                              <p
                                className="text-[13px] font-semibold leading-tight [overflow-wrap:anywhere] [word-break:break-word] [hyphens:auto]"
                                style={{ color: itemsColor }}
                              >
                                {item.name}
                              </p>
                            ) : null}
                            <MenuItemDescription text={item.description} color={itemsColor} />
                          </div>
                          {item.price ? (
                            <span className="shrink-0 whitespace-nowrap text-[13px] font-medium" style={{ color: priceColor }}>
                              {currencySymbol === "Rs." ? `₹${String(item.price).replace(/[^\d.]/g, "")}` : formatPrice(item.price)}
                            </span>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-[200px] items-center px-5 py-10 text-center">
          <p className="text-[13px] leading-relaxed text-[#737373]">Add categories in the editor — this list updates as you type.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className={`mx-auto flex h-full w-full flex-col items-center justify-center py-3 px-2 sm:px-3 ${showMobilePreview ? "max-w-[320px]" : "max-w-[720px]"}`}>

      {/* <div className="mb-3 flex items-center justify-center gap-2">
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ececec] text-[#535353]" title="QR code">
          <Icon icon="solar:qr-code-bold" className="text-lg" aria-hidden />
        </button>
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ececec] text-[#535353]" title="Share link">
          <Icon icon="solar:share-bold" className="text-lg" aria-hidden />
        </button>
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ececec] text-[#535353]" title="View menu">
          <Icon icon="solar:eye-bold" className="text-lg" aria-hidden />
        </button>
      </div> */}

      {showMobilePreview ? (
        <div className="relative w-full overflow-visible py-1">
          <div className="pointer-events-none absolute -inset-4 rounded-[3rem] bg-gradient-to-b from-[#d8e5df]/80 via-transparent to-[#c5d4cc]/40 blur-2xl sm:-inset-6" aria-hidden />

          <div className="relative mx-auto aspect-[1/2] h-[clamp(520px,min(56dvh,calc(100dvh-11rem)),min(600px,calc(100dvh-9rem)))] w-auto max-w-full rounded-[2.65rem] bg-gradient-to-b from-[#3a3a3a] via-[#1f1f1f] to-[#141414] p-[11px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06)_inset]">
            <div className="absolute -left-[2px] top-[18%] h-8 w-[3px] rounded-l-sm bg-[#2a2a2a] shadow-sm" aria-hidden />
            <div className="absolute -right-[2px] top-[22%] h-14 w-[3px] rounded-r-sm bg-[#2a2a2a] shadow-sm" aria-hidden />
            <div className="absolute -right-[2px] top-[38%] h-14 w-[3px] rounded-r-sm bg-[#2a2a2a] shadow-sm" aria-hidden />

            <div className="flex h-full flex-col overflow-hidden rounded-[2.05rem] bg-black ring-1 ring-white/[0.08]">
              <div className="relative z-10 shrink-0 bg-white">
                <div className="flex justify-center pt-2">
                  <div className="flex h-[28px] w-[112px] items-center justify-center rounded-full bg-black shadow-md ring-1 ring-white/10" aria-hidden>
                    <div className="h-2 w-2 rounded-full bg-[#1a1a1a]" />
                  </div>
                </div>
                <StatusBar />
              </div>
              {previewBody}
              <div className="flex shrink-0 justify-center bg-white pb-2 pt-1.5">
                <div className="h-1 w-[108px] rounded-full bg-[#0a0a0a]/20" aria-hidden />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full w-sm max-w-sm min-h-0 flex-col overflow-hidden rounded-2xl border border-[#dedede] bg-white shadow-sm">
          {previewBody}
        </div>
      )}
    </div>
  );
}
