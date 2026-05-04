import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import MenuEditorPreview from "../components/MenuEditorPreview";
import DigitalMenuBuilder from "../components/DigitalMenuBuilder";
import ShareMenuModal from "../components/ShareMenuModal";
import {
  getMyMenuStudioApi,
  publishDraftMenuStudioApi,
  putDraftMenuStudioApi,
  uploadMenuApi,
} from "./menu.api";
import { useAuthStore } from "../../auth/auth.store";
import { validateDigitalMenuClient } from "../validateDigitalMenuClient";
import { mergeMenuUiSettings, getMenuUiSettings } from "../menuUiSettings";
import { MAX_PDF_UPLOAD_BYTES } from "../menuConstants";
import { getPublicMenuUrl } from "../../../utils/menuPublicUrl";
import { runBrandConfettiBurst } from "../../../utils/brandConfetti";

function validatePickedPdf(file) {
  if (file.type !== "application/pdf") {
    return "Please choose a PDF file.";
  }
  if (file.size > MAX_PDF_UPLOAD_BYTES) {
    return `PDF must be at most ${Math.floor(MAX_PDF_UPLOAD_BYTES / (1024 * 1024))} MB.`;
  }
  return null;
}

function hasInteractiveContent(dm) {
  const cats = dm?.categories;
  return Array.isArray(cats) && cats.length > 0;
}

/** Stable JSON for comparing interactive menu payloads (key order–independent). */
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

function cloneDigitalMenu(dm) {
  try {
    return dm && typeof dm === "object" ? structuredClone(dm) : { categories: [] };
  } catch {
    return JSON.parse(JSON.stringify(dm && typeof dm === "object" ? dm : { categories: [] }));
  }
}

/** Snapshot of last synced server menu (GET mine / after save paths). */
function baselineFromStudioResponse(data) {
  const src = data?.draft || data?.published;
  if (!src) return null;
  return {
    menu_type: src.menu_type || "pdf",
    pdf_url: String(src.pdf_url || "").trim(),
    digital_menu: cloneDigitalMenu(src.digital_menu),
  };
}

export default function MenuStudioMvp() {
  const user = useAuthStore((s) => s.user);
  const pdfInputRef = useRef(null);
  const [s, setS] = useState(null);
  /** Last server-aligned editor snapshot; `null` = no published/draft row yet. */
  const [baseline, setBaseline] = useState(null);
  const [mode, setMode] = useState("pdf");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [digitalObj, setDigitalObj] = useState({ categories: [] });
  const [publishing, setPublishing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [showPdfLinkField, setShowPdfLinkField] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  /** When device frame is on: decorative shells only (not affiliated with Apple/Google). */
  const [previewDevice, setPreviewDevice] = useState("iphone");

  const { url: publicUrl, ok: publicUrlOk } = useMemo(() => getPublicMenuUrl(user), [user]);

  const uiSettings = useMemo(
    () =>
      mergeMenuUiSettings(mergeMenuUiSettings(getMenuUiSettings(), user?.preferences || {}), {
        interactiveTheme: s?.business_theme || {},
      }),
    [user?.preferences, s?.business_theme],
  );

  const load = async () => {
    const [data, err] = await getMyMenuStudioApi();
    if (err) {
      toast.error(err || "Failed to load menu studio.");
      return;
    }
    setS(data);
    setBaseline(baselineFromStudioResponse(data));
    const src = data?.draft || data?.published;
    if (!src) return;
    setMode(src.menu_type || "pdf");
    setPdfUrl(src.pdf_url || "");
    setDigitalObj(
      src.digital_menu && typeof src.digital_menu === "object" ? src.digital_menu : { categories: [] },
    );
    setPdfFile(null);
  };

  useEffect(() => {
    load();
  }, []);

  const applyPdfFile = (file) => {
    const msg = validatePickedPdf(file);
    if (msg) {
      toast.error(msg);
      return;
    }
    setPdfFile(file);
    setMode("pdf");
  };

  const onPickPdf = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    applyPdfFile(file);
  };

  const onPdfDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    applyPdfFile(file);
  };

  const hasRenderableMenu = useMemo(() => {
    if (mode === "pdf") return Boolean(pdfFile || String(pdfUrl || "").trim());
    return hasInteractiveContent(digitalObj);
  }, [mode, pdfFile, pdfUrl, digitalObj]);

  const isDirtyVersusBaseline = useMemo(() => {
    if (pdfFile) return true;
    if (baseline === null) return hasRenderableMenu;
    if (mode !== baseline.menu_type) return true;
    if (mode === "pdf") {
      return String(pdfUrl || "").trim() !== baseline.pdf_url;
    }
    return stableStringify(digitalObj) !== stableStringify(baseline.digital_menu);
  }, [baseline, mode, pdfUrl, pdfFile, digitalObj, hasRenderableMenu]);

  const canPublishLive = Boolean(s) && !publishing && isDirtyVersusBaseline && hasRenderableMenu;

  const publishLive = async () => {
    if (!canPublishLive) return;

    const hadPublishedBefore = Boolean(s?.last_published_at);

    if (mode === "interactive") {
      const err = validateDigitalMenuClient(digitalObj);
      if (err) {
        toast.error(err);
        return;
      }
    }

    let nextPdfUrl = String(pdfUrl || "").trim();

    setPublishing(true);
    try {
      if (mode === "pdf" && pdfFile) {
        const [, uerr] = await uploadMenuApi(pdfFile);
        if (uerr) {
          toast.error(uerr);
          return;
        }
        const [fresh, ferr] = await getMyMenuStudioApi();
        if (ferr) {
          toast.error(ferr);
          return;
        }
        const src = fresh?.draft || fresh?.published;
        nextPdfUrl = String(src?.pdf_url || "").trim();
        setS(fresh);
        setBaseline(baselineFromStudioResponse(fresh));
        setPdfUrl(nextPdfUrl);
        setPdfFile(null);
        if (!nextPdfUrl) {
          toast.error("Upload finished but the PDF link was not returned. Try again.");
          return;
        }
      }

      if (mode === "pdf" && !nextPdfUrl) {
        toast.error("Drop or choose a PDF here, or add a hosted PDF link below.");
        return;
      }

      const [data, err] = await putDraftMenuStudioApi({
        menu_type: mode,
        title: "Menu",
        pdf_url: mode === "pdf" ? nextPdfUrl : undefined,
        digital_menu: mode === "interactive" ? digitalObj : undefined,
      });
      if (err) {
        toast.error(err);
        return;
      }
      setS(data);
      /* Baseline is refreshed after publish only so a failed publish can retry without blocking the button. */

      const [pubData, perr] = await publishDraftMenuStudioApi();
      if (perr) {
        toast.error(perr);
        return;
      }
      setS(pubData);
      setBaseline(baselineFromStudioResponse(pubData));
      toast.success("Your menu is live for guests.");
      if (!hadPublishedBefore) {
        runBrandConfettiBurst();
        /* Let confetti paint a frame before the share sheet mounts (same tick can feel “missing”). */
        window.setTimeout(() => setShareOpen(true), 120);
      }
    } catch (e) {
      toast.error(e?.message || "Could not publish.");
    } finally {
      setPublishing(false);
    }
  };

  const lastPublishedLabel = useMemo(() => {
    if (!s?.last_published_at) return "Last published: Never";
    const dt = new Date(s.last_published_at);
    const formatted = dt.toLocaleString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `Last published: ${formatted}`;
  }, [s?.last_published_at]);

  return (
    <div className="h-[calc(100dvh-var(--nav-h)-var(--bottom-nav-h))] max-h-[calc(100dvh-var(--nav-h)-var(--bottom-nav-h))] w-full md:grid md:grid-cols-2 lg:grid-cols-5 xl:grid-cols-3 md:overflow-hidden">
      <ShareMenuModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={publicUrl}
        ready={publicUrlOk}
        businessName={user?.business_name || user?.shop_name || user?.business_slug}
      />

      <section className="md:col-span-1 lg:col-span-3 xl:col-span-2 flex min-h-0 flex-col gap-4 border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-4 shadow-sm sm:p-4">
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-[#262626]">Menu studio</h1>
              <p className="mt-0.5 text-xs font-medium text-[#525252]">{lastPublishedLabel}</p>
            </div>
            <button
              type="button"
              disabled={!canPublishLive}
              onClick={publishLive}
              title={
                !s || publishing
                  ? undefined
                  : !hasRenderableMenu
                    ? mode === "pdf"
                      ? "Add or upload a PDF before publishing."
                      : "Add at least one category before publishing."
                    : !isDirtyVersusBaseline
                      ? "Save changes here first — nothing new to publish."
                      : undefined
              }
              className="w-full shrink-0 rounded-lg bg-gradient-to-r from-[#1e9459] to-[#178a52] px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-5"
            >
              {publishing ? "Publishing…" : "Publish live"}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("pdf")}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${mode === "pdf" ? "bg-[#1e9459] text-white shadow" : "border border-[var(--app-border)] bg-[var(--app-surface)] text-[#262626]"
                }`}
            >
              PDF menu
            </button>
            <button
              type="button"
              onClick={() => setMode("interactive")}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${mode === "interactive"
                ? "bg-[#ff9423] text-white shadow"
                : "border border-[var(--app-border)] bg-[var(--app-surface)] text-[#262626]"
                }`}
            >
              Interactive
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {mode === "pdf" ? (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[#737373]">PDF file</p>
              <input ref={pdfInputRef} type="file" accept="application/pdf" className="sr-only" onChange={onPickPdf} />
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  if (!e.currentTarget.contains(e.relatedTarget)) setDragActive(false);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onPdfDrop}
                className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center transition ${dragActive
                  ? "border-[#1e9459] bg-emerald-50/60"
                  : "border-[var(--app-border)] bg-[#fafafa] hover:border-[#1e9459]/50 hover:bg-emerald-50/30"
                  }`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow ring-1 ring-black/5">
                  ⤓
                </span>
                <span className="text-sm font-semibold text-[#262626]">Drop PDF here or tap to choose</span>
                <span className="max-w-[280px] text-xs text-[#737373]">
                  Large tap target — works on phone. Max {Math.floor(MAX_PDF_UPLOAD_BYTES / (1024 * 1024))} MB.
                </span>
              </button>
              {pdfFile ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate font-medium text-emerald-950" title={pdfFile.name}>
                    {pdfFile.name}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-xs font-bold text-emerald-800 underline"
                    onClick={() => {
                      setPdfFile(null);
                      pdfInputRef.current?.click();
                    }}
                  >
                    Replace
                  </button>
                </div>
              ) : pdfUrl ? (
                <p className="text-xs text-[#525252]">
                  Current PDF is on the server. Drop a new file above to replace it, then publish.
                </p>
              ) : null}

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowPdfLinkField((v) => !v)}
                  className="text-xs font-semibold text-[#1e9459] underline-offset-2 hover:underline"
                >
                  {showPdfLinkField ? "Hide hosted PDF link" : "Use a hosted PDF link instead"}
                </button>
                {showPdfLinkField ? (
                  <label className="mt-2 block space-y-1.5 text-xs font-medium text-[#525252]">
                    PDF URL (https)
                    <input
                      className="w-full rounded-lg border border-[var(--app-border)] px-3 py-2.5 text-sm shadow-sm"
                      placeholder="https://cdn.example.com/menu.pdf"
                      value={pdfUrl}
                      onChange={(e) => setPdfUrl(e.target.value)}
                    />
                  </label>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <DigitalMenuBuilder value={digitalObj} onChange={setDigitalObj} />
            </div>
          )}
        </div>
      </section>

      <section className="md:col-span-1 lg:col-span-2 xl:col-span-1 sticky top-0 hidden h-[calc(100dvh-var(--nav-h)-var(--bottom-nav-h))] min-h-[60vh] flex-col border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm md:flex">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-[var(--app-surface)] px-3 py-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#737373]">Preview</p>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setShowMobilePreview((v) => !v)}
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                showMobilePreview ? "bg-[#e8f7ef] text-[#0b8a5a]" : "bg-[#efefef] text-[#5f5f5f]"
              }`}
            >
              Device frame {showMobilePreview ? "On" : "Off"}
            </button>
            {showMobilePreview ? (
              <div
                className="inline-flex rounded-full border border-neutral-200 bg-neutral-100/90 p-0.5"
                role="group"
                aria-label="Preview device style"
              >
                <button
                  type="button"
                  onClick={() => setPreviewDevice("iphone")}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    previewDevice === "iphone" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-600"
                  }`}
                >
                  iPhone
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("pixel")}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    previewDevice === "pixel" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-600"
                  }`}
                >
                  Pixel
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden border border-neutral-100 bg-[var(--app-bg)]">
          <MenuEditorPreview
            format={mode}
            pdfUrl={mode === "pdf" ? pdfUrl : null}
            pdfFile={mode === "pdf" ? pdfFile : null}
            digitalMenu={mode === "interactive" ? digitalObj : {}}
            menuStatus={s?.draft_pending ? "draft" : "published"}
            interactiveTheme={uiSettings.interactiveTheme}
            businessName={user?.business_name || user?.shop_name || user?.business_slug || "Menu"}
            showMobilePreview={showMobilePreview}
            previewDevice={previewDevice}
          />
        </div>
      </section>
    </div>
  );
}
