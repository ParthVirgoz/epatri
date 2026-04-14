import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

function bustCacheUrl(url, version) {
  if (!url) return "";
  try {
    const u = new URL(url);
    u.searchParams.set("v", String(version));
    return u.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}v=${version}`;
  }
}

/**
 * Renders PDF pages to canvases — works on Android/iOS where `<iframe src=pdf>` often shows only “Open”.
 */
export default function PdfCanvasPreview({ url, file, version = 0, className = "" }) {
  const wrapRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    wrap.replaceChildren();

    if (!url && !file) {
      setStatus("idle");
      setError(null);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      setStatus("loading");
      setError(null);
      try {
        let loadingTask;
        if (file) {
          const data = await file.arrayBuffer();
          loadingTask = pdfjsLib.getDocument({ data });
        } else {
          loadingTask = pdfjsLib.getDocument({
            url: bustCacheUrl(url, version),
            withCredentials: false,
          });
        }

        const pdf = await loadingTask.promise;
        if (cancelled) return;

        const maxW = Math.max(280, Math.min(920, wrap.clientWidth || 920));

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const scale = maxW / base.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { alpha: false });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "max-w-full bg-white shadow-sm";
          canvas.style.height = "auto";

          const renderTask = page.render({ canvasContext: ctx, viewport });
          await renderTask.promise;
          wrap.appendChild(canvas);
        }

        if (!cancelled) setStatus("ready");
      } catch (e) {
        if (!cancelled) {
          wrap.replaceChildren();
          setError(e?.message || "Could not load PDF preview.");
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, file, version]);

  if (!url && !file) return null;

  return (
    <div
      className={`relative overflow-y-auto rounded-lg border border-[#dbdbdb] bg-[#2a2a2a] ${className}`}
      style={{ maxHeight: "min(82vh, 780px)" }}
    >
      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex min-h-[220px] items-center justify-center bg-[#2a2a2a]/95 text-sm text-[#a8a8a8]">
          Loading preview…
        </div>
      )}
      {error && (
        <div className="relative z-10 px-4 py-8 text-center text-sm text-[#ffb4a8]">
          {error}
          <p className="mt-2 text-xs text-[#8e8e8e]">If this persists, the file host may block in-app loading — try Download.</p>
        </div>
      )}
      <div ref={wrapRef} className="relative z-0 flex min-h-[120px] flex-col items-center gap-3 px-2 py-3" />
    </div>
  );
}
