import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { toast } from "sonner";

function IconButton({ label, children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-w-[72px] flex-col items-center gap-2 rounded-xl p-2 text-center transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f0f0f0] text-xl shadow-sm ring-1 ring-black/5">
        {children}
      </span>
      <span className="max-w-[76px] text-[11px] font-semibold leading-tight text-[#262626]">{label}</span>
    </button>
  );
}

export default function ShareMenuModal({ open, onClose, url, ready, businessName }) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const writeClipboard = useCallback(async (text) => {
    await navigator.clipboard.writeText(text);
  }, []);

  const copy = useCallback(async () => {
    if (!url) return;
    try {
      await writeClipboard(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select the link and copy manually");
    }
  }, [url, writeClipboard]);

  useEffect(() => {
    if (!open) {
      setQrOpen(false);
      setCopied(false);
    }
  }, [open]);

  const shareText = businessName ? `Menu — ${businessName}` : "Our menu";
  const encodedUrl = url ? encodeURIComponent(url) : "";
  const qrSrc =
    url && ready
      ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(url)}`
      : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const openWindow = (href) => {
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const downloadQr = useCallback(async () => {
    if (!qrSrc) return;
    try {
      const res = await fetch(qrSrc);
      if (!res.ok) throw new Error("bad_qr_response");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const name = String(businessName || "menu").trim().replace(/\s+/g, "-").toLowerCase() || "menu";
      a.href = objectUrl;
      a.download = `${name}-qr.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      openWindow(qrSrc);
    }
  }, [businessName, qrSrc]);

  if (!open) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10">
        <div className="flex items-center justify-between border-b border-[#eee] px-5 py-4">
          <h2 className="text-lg font-bold text-[#111]">Share</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#666] hover:bg-[#f5f5f5]"
            aria-label="Close"
          >
            <Icon icon="solar:close-circle-bold" className="text-xl" aria-hidden />
          </button>
        </div>

        <div className="px-5 pb-6 pt-5">
          {!ready || !url ? (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Public URL is not configured. Set your customer-facing site base URL and business identifier in settings,
              then return here.
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-[#555]">
                Customers use this link to open your public menu page—the same destination as Open in new tab in the admin.
              </p>

              <div className="flex items-stretch gap-2 rounded-2xl border border-[#e8e8e8] bg-[#fafafa] p-2 pl-4">
                <div className="min-w-0 flex-1 self-center">
                  <p className="truncate text-sm font-medium text-[#111]" title={url}>
                    {url.replace(/^https?:\/\//, "")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copy}
                  className="shrink-0 rounded-xl bg-[#111] px-5 py-2.5 text-sm font-bold text-white hover:bg-black"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-1 sm:gap-2">
                <IconButton
                  label="QR code"
                  onClick={() => setQrOpen(true)}
                  disabled={!qrSrc}
                >
                  <Icon icon="solar:qr-code-bold" className="h-7 w-7 text-[#2f2f2f]" aria-hidden />
                </IconButton>
                <IconButton
                  label="Instagram"
                  onClick={async () => {
                    try {
                      await writeClipboard(url);
                      toast.success("Copied — paste in your Instagram bio or story link");
                    } catch {
                      toast.error("Could not copy");
                    }
                  }}
                  disabled={!url}
                >
                  <Icon icon="ri:instagram-fill" className="h-7 w-7 text-[#dd2a7b]" aria-hidden />
                </IconButton>
                <IconButton
                  label="WhatsApp"
                  onClick={() =>
                    openWindow(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`)
                  }
                  disabled={!url}
                >
                  <Icon icon="ic:baseline-whatsapp" className="h-7 w-7 text-[#25D366]" aria-hidden />
                </IconButton>
                <IconButton
                  label="Facebook"
                  onClick={() => openWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}
                  disabled={!url}
                >
                  <Icon icon="ic:baseline-facebook" className="h-7 w-7 text-[#1877F2]" aria-hidden />
                </IconButton>
                <IconButton
                  label="X"
                  onClick={() =>
                    openWindow(
                      `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(shareText)}`,
                    )
                  }
                  disabled={!url}
                >
                  <Icon icon="ri:twitter-x-fill" className="h-6 w-6 text-[#111]" aria-hidden />
                </IconButton>
                <IconButton
                  label="Reddit"
                  onClick={() =>
                    openWindow(
                      `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent(shareText)}`,
                    )
                  }
                  disabled={!url}
                >
                  <Icon icon="ri:reddit-fill" className="h-7 w-7 text-[#FF4500]" aria-hidden />
                </IconButton>
                <IconButton
                  label="Email"
                  onClick={() =>
                    openWindow(
                      `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`Here is our menu:\n\n${url}`)}`,
                    )
                  }
                  disabled={!url}
                >
                  <Icon icon="solar:letter-bold" className="h-7 w-7 text-[#555]" aria-hidden />
                </IconButton>
              </div>
            </>
          )}
        </div>
      </div>
      {qrOpen && qrSrc ? (
        <div className="fixed inset-0 z-[110] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
            aria-label="Close QR dialog"
            onClick={() => setQrOpen(false)}
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10">
            <div className="flex items-center justify-between border-b border-[#eee] px-5 py-4">
              <h3 className="text-base font-bold text-[#111]">Menu QR code</h3>
              <button
                type="button"
                onClick={() => setQrOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[#666] hover:bg-[#f5f5f5]"
                aria-label="Close QR dialog"
              >
                <Icon icon="solar:close-circle-bold" className="text-xl" aria-hidden />
              </button>
            </div>
            <div className="px-5 pb-6 pt-5">
              <div className="flex flex-col items-center rounded-2xl border border-[#eee] bg-white py-4">
                <img src={qrSrc} alt="QR code for your menu link" className="h-[220px] w-[220px]" />
                <p className="mt-2 px-4 text-center text-xs text-[#737373]">Scan to open the public menu</p>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={downloadQr}
                  className="rounded-xl border border-[#dbdbdb] bg-[#fafafa] px-2 py-2 text-xs font-semibold text-[#262626] hover:bg-[#f2f2f2]"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={copy}
                  className="rounded-xl border border-[#dbdbdb] bg-[#fafafa] px-2 py-2 text-xs font-semibold text-[#262626] hover:bg-[#f2f2f2]"
                >
                  Copy link
                </button>
                <button
                  type="button"
                  onClick={() => openWindow(url)}
                  className="rounded-xl border border-[#dbdbdb] bg-[#fafafa] px-2 py-2 text-xs font-semibold text-[#262626] hover:bg-[#f2f2f2]"
                >
                  Open menu
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
