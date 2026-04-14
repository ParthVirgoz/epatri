import { useEffect, useState } from "react";
import { uploadMenuApi } from "./menu.api";
import { useAuthStore } from "../../auth/auth.store";
import PdfCanvasPreview from "../../../components/PdfCanvasPreview";

export default function MenuUpload() {
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  /** Bust browser cache after re-upload (same public URL). */
  const [liveRev, setLiveRev] = useState(() => Date.now());

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const savedPdfUrl = user?.pdf_url ?? null;

  const handleFile = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      setMsg({ type: "err", text: "PDF only" });
      return;
    }
    setMsg(null);
    setFile(selected);
  };

  const handleDownloadMenu = async () => {
    if (!savedPdfUrl) return;
    const name = `${user?.shop_username || "menu"}.pdf`;
    setMsg(null);
    try {
      const res = await fetch(savedPdfUrl, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const type = blob.type || "application/pdf";
      const pdfBlob = type.includes("pdf") ? blob : new Blob([blob], { type: "application/pdf" });
      const objectUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      setMsg({
        type: "err",
        text: "Could not download the PDF. Check your connection or try again on Wi‑Fi.",
      });
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
          Upload a PDF — guests open it from your public link (Profile). Only that link feeds Insights. Preview is
          drawn in the app (works on phones; Download saves the file only).
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
          <PdfCanvasPreview url={savedPdfUrl} version={liveRev} />
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

      {file && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8e8e8e]">New file preview</p>
          <PdfCanvasPreview file={file} version={file.name + String(file.size)} />
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
