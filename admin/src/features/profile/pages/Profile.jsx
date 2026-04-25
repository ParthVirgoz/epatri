import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useAuthStore } from "../../auth/auth.store";
import { Link, useNavigate } from "react-router-dom";
import { getPublicMenuUrl } from "../../../utils/menuPublicUrl";
import { updateMeApi } from "../../auth/auth.api";
import { toast } from "sonner";
import {
  getMenuUiSettings,
  saveMenuUiSettings,
  mergeMenuUiSettings,
  getProfileAvatar,
  saveProfileAvatar,
  INTERACTIVE_THEME_DEFAULTS,
} from "../../menu/menuUiSettings";

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const [shopName, setShopName] = useState(user?.shop_name || "");
  const [avatarDataUrl, setAvatarDataUrl] = useState(
    () => user?.shop_logo_data_url || getProfileAvatar() || "",
  );
  const [settings, setSettings] = useState(() => mergeMenuUiSettings(getMenuUiSettings(), user?.preferences || {}));
  const [themeDraft, setThemeDraft] = useState(() => {
    const t = settings.interactiveTheme || {};
    const d = INTERACTIVE_THEME_DEFAULTS;
    return {
      surface: t.surface || d.surface,
      surfaceTextColor: t.surfaceTextColor || t.bodyTextColor || d.surfaceTextColor,
      brandNameColor: t.brandNameColor || d.brandNameColor,
      itemsColor: t.itemsColor || d.itemsColor,
      categoryColor: t.categoryColor || t.categoryTextColor || d.categoryColor,
      priceColor: t.priceColor || t.priceTextColor || d.priceColor,
      menuCardColor: t.menuCardColor || t.cardColor || d.menuCardColor,
      currencySymbol: t.currencySymbol || d.currencySymbol,
    };
  });

  const handleLogout = () => {
    logout();
    navigate("/welcome", { replace: true });
  };

  const name = user?.shop_name || user?.email || "Your place";
  const handle = user?.shop_username ? `@${user.shop_username}` : user?.email || "";
  const avatarLabel = useMemo(() => (shopName || name || "?").charAt(0).toUpperCase(), [shopName, name]);

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

  useEffect(() => {
    const fromServer = user?.shop_logo_data_url;
    if (fromServer) {
      setAvatarDataUrl(fromServer);
      return;
    }
    const cached = getProfileAvatar();
    setAvatarDataUrl(cached || "");
  }, [user?.shop_logo_data_url, user?.id]);

  const handleSaveName = async () => {
    const next = String(shopName || "").trim();
    if (!next) {
      toast.error("Business name is required");
      return;
    }
    setSavingName(true);
    const [, err] = await updateMeApi({ shop_name: next });
    setSavingName(false);
    if (err) {
      toast.error(err);
      return;
    }
    await refreshUser();
    toast.success("Profile name updated");
  };

  const onAvatarPick = async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be below 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const data = String(reader.result || "");
      if (!data.startsWith("data:image/")) {
        toast.error("Could not read image");
        return;
      }
      setSavingLogo(true);
      const [, err] = await updateMeApi({ shop_logo_data_url: data });
      setSavingLogo(false);
      if (err) {
        const msg = String(err).toLowerCase();
        const missingCol =
          msg.includes("shop_logo_data_url") ||
          msg.includes("schema cache") ||
          (msg.includes("column") && msg.includes("profiles"));
        toast.error(
          missingCol
            ? "Database is missing column shop_logo_data_url. Run backend/sql/add_shop_logo_data_url.sql in Supabase."
            : err,
        );
        return;
      }
      setAvatarDataUrl(data);
      saveProfileAvatar(data);
      await refreshUser();
      toast.success("Business logo saved to your account");
    };
    reader.readAsDataURL(file);
    ev.target.value = "";
  };

  const onRemoveLogo = async () => {
    setSavingLogo(true);
    const [, err] = await updateMeApi({ shop_logo_data_url: null });
    setSavingLogo(false);
    if (err) {
      toast.error(err);
      return;
    }
    setAvatarDataUrl("");
    saveProfileAvatar("");
    await refreshUser();
    toast.success("Logo removed");
  };

  const patchSettings = async (patch) => {
    const next = mergeMenuUiSettings(settings, patch);
    saveMenuUiSettings(next);
    setSettings(next);
    const [, err] = await updateMeApi({ preferences: next });
    if (err) {
      toast.error(err);
      return;
    }
    await refreshUser();
    toast.success("Settings updated");
  };

  useEffect(() => {
    const t = settings.interactiveTheme || {};
    const d = INTERACTIVE_THEME_DEFAULTS;
    // Draft mirrors loaded preferences when settings refresh from server.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync
    setThemeDraft({
      surface: t.surface || d.surface,
      surfaceTextColor: t.surfaceTextColor || t.bodyTextColor || d.surfaceTextColor,
      brandNameColor: t.brandNameColor || d.brandNameColor,
      itemsColor: t.itemsColor || d.itemsColor,
      categoryColor: t.categoryColor || t.categoryTextColor || d.categoryColor,
      priceColor: t.priceColor || t.priceTextColor || d.priceColor,
      menuCardColor: t.menuCardColor || t.cardColor || d.menuCardColor,
      currencySymbol: t.currencySymbol || d.currencySymbol,
    });
  }, [settings.interactiveTheme]);

  const handleSaveTheme = async () => {
    setSavingTheme(true);
    await patchSettings({
      interactiveTheme: {
        surface: themeDraft.surface,
        surfaceTextColor: themeDraft.surfaceTextColor,
        brandNameColor: themeDraft.brandNameColor,
        itemsColor: themeDraft.itemsColor,
        categoryColor: themeDraft.categoryColor,
        priceColor: themeDraft.priceColor,
        menuCardColor: themeDraft.menuCardColor,
        currencySymbol: themeDraft.currencySymbol,
      },
    });
    setSavingTheme(false);
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-2 pb-4">
      <section className="rounded-xl border border-[#dbdbdb] bg-white p-4 shadow-sm">
        <div className="mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8e8e8e]">Business logo</p>
          <p className="text-xs text-[#737373]">Square images look best. Max 2 MB. Saved to your account so it follows you on any device.</p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-[#efefef] text-2xl font-semibold text-[#8e8e8e]">
              {avatarDataUrl ? <img src={avatarDataUrl} alt="Business logo" className="h-full w-full object-cover" /> : avatarLabel}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[#262626]">{name}</p>
              {handle ? <p className="truncate text-sm text-[#737373]">{handle}</p> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <label
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#dbdbdb] bg-[#fafafa] px-3 py-2 text-xs font-semibold text-[#262626] hover:bg-[#f2f2f2] ${savingLogo ? "pointer-events-none opacity-50" : ""}`}
            >
              <Icon icon="solar:gallery-add-outline" className="text-base" aria-hidden />
              {savingLogo ? "Saving…" : "Upload logo"}
              <input type="file" accept="image/*" className="hidden" disabled={savingLogo} onChange={onAvatarPick} />
            </label>
            {avatarDataUrl ? (
              <button
                type="button"
                disabled={savingLogo}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#e9d5b5] bg-[#fff7ed] px-3 py-2 text-xs font-semibold text-[#9a3412] hover:bg-[#ffedd5] disabled:opacity-50"
                onClick={onRemoveLogo}
              >
                <Icon icon="solar:trash-bin-trash-outline" className="text-base" aria-hidden />
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#dbdbdb] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8e8e8e]">Business identity</p>
            <h2 className="text-base font-semibold text-[#262626]">Name and public link</h2>
          </div>
        </div>
        <div className="mt-3 grid gap-4 md:grid-cols-[1.1fr_1fr]">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#8e8e8e]">Business name</label>
            <div className="flex gap-2">
              <input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full rounded-lg border border-[#dbdbdb] bg-white px-3 py-2 text-sm text-[#262626]"
                placeholder="Your business name"
              />
              <button
                type="button"
                onClick={handleSaveName}
                disabled={savingName}
                className="inline-flex items-center justify-center rounded-lg bg-[#171717] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {savingName ? "..." : "Save"}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#8e8e8e]">Public menu link</label>
            {menuUrl && !menuUrl.startsWith("Set ") ? (
              <>
                <p className="break-all rounded-lg border border-[#dbdbdb] bg-[#fafafa] px-3 py-2 text-sm text-(--brand-e)">{menuUrl}</p>
                <button
                  type="button"
                  onClick={copyMenuLink}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#dbdbdb] bg-white px-3 py-2 text-xs font-semibold text-[#262626] hover:bg-[#f8f8f8]"
                >
                  <Icon icon="solar:copy-outline" className="text-base" aria-hidden />
                  {copied ? "Copied" : "Copy link"}
                </button>
              </>
            ) : (
              <p className="rounded-lg border border-[#f3ddb9] bg-[#fff7ed] px-3 py-2 text-sm text-[#9a3412]">
                {menuUrl || "Create a business username to generate your public menu link."}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-[#dbdbdb] bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-[#262626]">Interactive menu theme</p>
        <p className="text-xs text-[#737373]">
          PDF menu does not use these colors. They apply to the public interactive menu and guest layout. Toggle buttons on the menu page
          use fixed styling. Use{" "}
          <Link to="/app/menu" className="font-semibold text-brand-e underline-offset-2 hover:underline">
            Menu studio
          </Link>{" "}
          to edit items and preview.
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8e8e8e]">Page</p>
        <div className="flex items-center justify-between text-sm">
          <span>Background (page)</span>
          <input
            type="color"
            value={themeDraft.surface}
            onChange={(e) => setThemeDraft((prev) => ({ ...prev, surface: e.target.value }))}
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Surface text (QR line, sidebar helper)</span>
          <input
            type="color"
            value={themeDraft.surfaceTextColor}
            onChange={(e) => setThemeDraft((prev) => ({ ...prev, surfaceTextColor: e.target.value }))}
          />
        </div>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[#8e8e8e]">Menu</p>
        <div className="flex items-center justify-between text-sm">
          <span>Brand name</span>
          <input
            type="color"
            value={themeDraft.brandNameColor}
            onChange={(e) => setThemeDraft((prev) => ({ ...prev, brandNameColor: e.target.value }))}
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Items &amp; descriptions</span>
          <input
            type="color"
            value={themeDraft.itemsColor}
            onChange={(e) => setThemeDraft((prev) => ({ ...prev, itemsColor: e.target.value }))}
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Category headings</span>
          <input
            type="color"
            value={themeDraft.categoryColor}
            onChange={(e) => setThemeDraft((prev) => ({ ...prev, categoryColor: e.target.value }))}
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Prices</span>
          <input
            type="color"
            value={themeDraft.priceColor}
            onChange={(e) => setThemeDraft((prev) => ({ ...prev, priceColor: e.target.value }))}
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Menu card (content panel)</span>
          <input
            type="color"
            value={themeDraft.menuCardColor}
            onChange={(e) => setThemeDraft((prev) => ({ ...prev, menuCardColor: e.target.value }))}
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Currency label</span>
          <input
            value={themeDraft.currencySymbol}
            onChange={(e) => setThemeDraft((prev) => ({ ...prev, currencySymbol: e.target.value.slice(0, 6) }))}
            className="max-w-[120px] rounded border border-[#dbdbdb] bg-[#fafafa] px-2 py-1 text-sm"
            placeholder="Rs."
          />
        </div>
        <button
          type="button"
          onClick={handleSaveTheme}
          disabled={savingTheme}
          className="w-full rounded-lg bg-[#171717] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {savingTheme ? "Saving..." : "Save theme colors"}
        </button>
        <Link
          to="/app/menu"
          className="block rounded-lg border border-[#dbdbdb] bg-[#fafafa] px-3 py-2 text-center text-xs font-semibold text-[#262626] hover:bg-[#f2f2f2]"
        >
          Open interactive menu editor
        </Link>
      </section>

      <div className="overflow-hidden rounded-xl border border-[#dbdbdb] bg-white shadow-sm">
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
