import { useMemo, useState } from "react";
import { useAuthStore } from "../features/auth/auth.store";
import { getPublicMenuUrl } from "../utils/menuPublicUrl";
import ShareMenuModal from "../features/menu/components/ShareMenuModal";

function ShareIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" aria-hidden>
      <path d="M12 3v10" strokeLinecap="round" />
      <path d="M8 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Header share: Web Share API on supported devices, otherwise copy link.
 */
export default function ShareMenuLinkButton() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);

  const { url, ok } = useMemo(() => getPublicMenuUrl(user), [user]);
  const label = ok ? "Share menu link" : "Set up menu link";

  return (
    <>
      <ShareMenuModal
        open={open}
        onClose={() => setOpen(false)}
        url={url}
        ready={ok}
        businessName={user?.business_name || user?.shop_name || user?.business_slug}
      />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-xs font-bold text-white shadow-md shadow-neutral-900/15 transition hover:bg-black hover:shadow-lg sm:pr-4 sm:pl-3 sm:text-sm"
        aria-label={label}
        title={label}
      >
        <ShareIcon />
        <span className="hidden sm:inline">Share</span>
      </button>
    </>
  );
}
