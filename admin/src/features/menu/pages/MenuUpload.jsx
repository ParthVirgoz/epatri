import { useEffect, useMemo, useState } from "react";
import { uploadMenuApi } from "./menu.api";
import { useAuthStore } from "../../auth/auth.store";

/** Cache-bust + fit width in common embedded PDF viewers (reduces nested horizontal scroll). */
function pdfIframeSrc(url, rev) {
  if (!url) return "";
  try {
    const u = new URL(url);
    u.searchParams.set("v", String(rev));
    u.hash = "view=FitH";
    return u.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}v=${rev}#view=FitH`;
  }
}

function pdfBlobPreviewSrc(blobUrl) {
  if (!blobUrl) return "";
  return `${blobUrl}#view=FitH`;
}

export default function MenuUpload() {
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const [file, setFile] = useState(null);
  const [localPreview, setLocalPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  /** Bust browser cache after re-upload (same public URL). */
  const [liveRev, setLiveRev] = useState(() => Date.now());

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const savedPdfUrl = user?.pdf_url ?? null;

  const livePreviewSrc = useMemo(
    () => (savedPdfUrl ? pdfIframeSrc(savedPdfUrl, liveRev) : ""),
    [savedPdfUrl, liveRev]
  );

  const handleFile = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      setMsg({ type: "err", text: "PDF only" });
      return;
    }
    setMsg(null);
    setFile(selected);
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(selected);
    });
  };

  const handleDownloadMenu = async () => {
    if (!savedPdfUrl) return;
    const name = `${user?.shop_username || "menu"}.pdf`;
    try {
      const res = await fetch(savedPdfUrl);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = name;
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      const a = document.createElement("a");
      a.href = savedPdfUrl;
      a.download = name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMsg({ type: "err", text: "Choose a file first" });
      return;
    }
    setLoading(true);
    setMsg(null);
    const [, error] = await uploadMenuApi(file);
    setLoading(false);
    if (error) {
      setMsg({ type: "err", text: error });
      return;
    }
    setFile(null);
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
    setLiveRev(Date.now());
    await refreshUser();
    setMsg({
      type: "ok",
      text: "Saved. Guests now see this menu on your public link.",
    });
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-4 px-1 sm:px-0">
      <div>
        <h2 className="text-lg font-semibold text-[#262626]">Your menu</h2>
        <p className="mt-1 text-sm text-[#737373]">
          Upload a PDF — guests open it from your public link (Profile). Only that link feeds Insights.
        </p>
      </div>

      {msg && (
        <div
          className={`rounded border px-3 py-2 text-sm ${
            msg.type === "ok"
              ? "border-[#dbdbdb] bg-white text-[#262626]"
              : "border-[#ffccc7] bg-[#fff2f0] text-[#cf1322]"
          }`}
        >
          {msg.text}
        </div>
      )}

      {savedPdfUrl ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8e8e8e]">
              Live menu preview
            </p>
            <button
              type="button"
              onClick={handleDownloadMenu}
              className="text-xs font-semibold text-[var(--brand-e)] hover:text-[var(--brand-e-dark)]"
            >
              Download PDF
            </button>
          </div>
          {/* <p className="text-[11px] leading-snug text-[#8e8e8e]">
            Shown only while you&apos;re signed in. This preview does not count as a menu open — analytics use your guest
            link from Profile, not this screen.
          </p> */}
          <div className="overflow-hidden rounded-lg border border-[#dbdbdb] bg-[#1a1a1a] shadow-sm">
            <iframe
              title="Your menu PDF"
              src={livePreviewSrc}
              className="block h-[min(82vh,780px)] w-full border-0 bg-[#2d2d2d]"
            />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#dbdbdb] bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-[#262626]">Add your menu PDF</p>
          <p className="mt-2 text-sm leading-relaxed text-[#737373]">
            People who open your link expect to see what you serve. Upload your menu so they can browse dishes and
            decide what to order — a clear, up-to-date menu helps turn views into orders.
          </p>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8e8e8e]">
          {savedPdfUrl ? "Replace menu" : "Upload PDF"}
        </p>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed border-[#dbdbdb] bg-white px-6 py-10 text-center transition-colors hover:border-[#a8a8a8]">
          <span className="text-sm font-semibold text-[var(--brand-e)]">Choose PDF</span>
          <span className="text-xs text-[#8e8e8e]">Max 5 MB · one file</span>
          <input type="file" accept="application/pdf" className="hidden" onChange={handleFile} />
        </label>
      </div>

      {localPreview && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8e8e8e]">
            New file preview
          </p>
          <div className="overflow-hidden rounded-lg border border-[#dbdbdb] bg-[#1a1a1a] shadow-sm">
            <iframe
              title="New PDF preview"
              src={pdfBlobPreviewSrc(localPreview)}
              className="block h-[min(65vh,560px)] w-full border-0 bg-[#2d2d2d]"
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={loading || !file}
        className="w-full rounded-lg bg-[var(--brand-e)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-e-dark)] disabled:opacity-40"
      >
        {loading ? "Uploading…" : savedPdfUrl ? "Replace live menu" : "Share menu"}
      </button>
    </div>
  );
}
