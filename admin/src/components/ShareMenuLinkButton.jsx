import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/auth.store";
import { getPublicMenuUrl } from "../utils/menuPublicUrl";

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
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState(null);

  const { url, ok } = getPublicMenuUrl(user);

  const handleClick = async () => {
    setFeedback(null);
    if (!ok || !url) {
      navigate("/profile");
      return;
    }

    const title = user?.shop_name ? `${user.shop_name} — menu` : "Our menu";
    const text = "Check out our menu";

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setFeedback("copy");
      window.setTimeout(() => setFeedback(null), 2000);
    } catch {
      void 0;
    }
  };

  const label =
    feedback === "copy"
      ? "Link copied"
      : ok
        ? "Share menu link"
        : "Set up menu link";

  return (
    <div className="relative flex flex-col items-end">
      <button
        type="button"
        onClick={handleClick}
        className="flex h-10 w-10 items-center justify-center rounded-full text-[#262626] transition-colors hover:bg-[#f2f2f2] active:bg-[#ebebeb]"
        aria-label={label}
        title={label}
      >
        <ShareIcon />
      </button>
      {feedback === "copy" && (
        <span
          className="absolute right-0 top-full z-30 mt-1 whitespace-nowrap rounded-md bg-[#262626] px-2 py-1 text-[10px] font-semibold text-white shadow-md"
          role="status"
        >
          Copied
        </span>
      )}
    </div>
  );
}
