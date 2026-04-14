import { useState } from "react";
import { useAuthStore } from "../../auth/auth.store";
import { useNavigate } from "react-router-dom";
import { getPublicMenuUrl } from "../../../utils/menuPublicUrl";

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/welcome", { replace: true });
  };

  const name = user?.shop_name || user?.email || "Your place";
  const handle = user?.shop_username ? `@${user.shop_username}` : user?.email || "";

  const { url: publicUrl, ok: menuOk, reason } = getPublicMenuUrl(user);
  const menuUrl = menuOk
    ? publicUrl
    : user?.shop_username && reason === "no_base"
      ? "Set VITE_PUBLIC_MENU_BASE_URL in admin/.env (e.g. http://localhost:4321)"
      : "";

  const copyMenuLink = async () => {
    if (!menuUrl || menuUrl.startsWith("Set ")) return;
    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      void 0;
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      {menuUrl && !menuUrl.startsWith("Set ") && (
        <div className="rounded-none border border-[#dbdbdb] bg-white px-4 py-4 sm:rounded-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8e8e8e]">Your menu link</p>
          <p className="mt-1 break-all text-sm text-[var(--brand-e)]">{menuUrl}</p>
          <p className="mt-2 text-xs text-[#8e8e8e]">
            Add this to Instagram bio, Google Map, own website or a short link. Insights → &quot;Opened from&quot; shows referrers when
            browsers send them.
          </p>
          <button
            type="button"
            onClick={copyMenuLink}
            className="mt-3 w-full rounded-lg border border-[#dbdbdb] bg-[#fafafa] py-2 text-sm font-semibold text-[#262626] active:bg-[#efefef]"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      )}
      {menuUrl?.startsWith("Set ") && (
        <div className="rounded border border-[#dbdbdb] bg-white px-4 py-3 text-sm text-[#737373]">{menuUrl}</div>
      )}

      <div className="flex flex-col items-center rounded-none border border-[#dbdbdb] bg-white px-6 py-10 sm:rounded-sm">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#efefef] text-3xl font-light text-[#8e8e8e]">
          {(name || "?").charAt(0).toUpperCase()}
        </div>
        <h1 className="text-center text-lg font-semibold text-[#262626]">{name}</h1>
        {handle && <p className="mt-1 text-sm text-[#737373]">{handle}</p>}
      </div>

      <div className="overflow-hidden rounded-none border border-[#dbdbdb] bg-white sm:rounded-sm">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full px-4 py-3.5 text-left text-sm font-semibold text-[#ed4956] active:bg-[#fafafa]"
        >
          Log out
        </button>
      </div>

      <p className="px-2 text-center text-xs text-[#a8a8a8]">
        Simple tools for your menu — nothing extra.
      </p>
    </div>
  );
}
