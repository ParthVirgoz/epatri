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
  INTERACTIVE_MENU_PANEL_BG,
  INTERACTIVE_THEME_DEFAULTS,
} from "../../menu/menuUiSettings";
import ProfilePageSkeleton from "../../../shared/components/skeletons/ProfilePageSkeleton";

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [editingBusinessName, setEditingBusinessName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const [shopName, setShopName] = useState(user?.business_name || user?.shop_name || "");
  const [avatarDataUrl, setAvatarDataUrl] = useState(() => user?.shop_logo_data_url || "");
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
      currencySymbol: t.currencySymbol || d.currencySymbol,
    };
  });

  const handleLogout = () => {
    logout();
    navigate("/welcome", { replace: true });
  };

  const name = user?.business_name || user?.shop_name || user?.email || "Your place";
  const slugLine = user?.business_slug ? `@${user.business_slug}` : "";
  const accountEmail = String(user?.email || "").trim();
  const showEmailUnderLogo =
    Boolean(accountEmail) && (Boolean(slugLine) || name !== accountEmail);
  const avatarLabel = useMemo(() => (shopName || name || "?").charAt(0).toUpperCase(), [shopName, name]);

  const { url: publicUrl, ok: menuOk, reason } = getPublicMenuUrl(user);
  const menuUrl = menuOk
    ? publicUrl
    : user?.business_slug && reason === "no_base"
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
    if (!editingBusinessName) {
      setShopName(user?.business_name || user?.shop_name || "");
    }
  }, [user?.business_name, user?.shop_name, user?.id, editingBusinessName]);

  useEffect(() => {
    setAvatarDataUrl(user?.shop_logo_data_url || "");
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
    setEditingBusinessName(false);
    toast.success("Profile name updated");
  };

  const cancelBusinessNameEdit = () => {
    setShopName(user?.business_name || user?.shop_name || "");
    setEditingBusinessName(false);
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
    await refreshUser();
    toast.success("Logo removed");
  };

  const patchSettings = async (patch, successMessage = "Settings updated") => {
    const next = mergeMenuUiSettings(settings, patch);
    saveMenuUiSettings(next);
    setSettings(next);
    const [, err] = await updateMeApi({ preferences: next });
    if (err) {
      toast.error(err);
      return;
    }
    await refreshUser();
    toast.success(successMessage);
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
      currencySymbol: t.currencySymbol || d.currencySymbol,
    });
  }, [settings.interactiveTheme]);

  const handleSaveTheme = async () => {
    setSavingTheme(true);
    await patchSettings(
      {
        interactiveTheme: {
          surface: themeDraft.surface,
          surfaceTextColor: themeDraft.surfaceTextColor,
          brandNameColor: themeDraft.brandNameColor,
          itemsColor: themeDraft.itemsColor,
          categoryColor: themeDraft.categoryColor,
          priceColor: themeDraft.priceColor,
          menuCardColor: INTERACTIVE_MENU_PANEL_BG,
          currencySymbol: themeDraft.currencySymbol,
        },
      },
      "Theme saved",
    );
    setSavingTheme(false);
  };

  const handleResetThemeDefaults = async () => {
    const d = INTERACTIVE_THEME_DEFAULTS;
    const nextDraft = {
      surface: d.surface,
      surfaceTextColor: d.surfaceTextColor,
      brandNameColor: d.brandNameColor,
      itemsColor: d.itemsColor,
      categoryColor: d.categoryColor,
      priceColor: d.priceColor,
      currencySymbol: d.currencySymbol,
    };
    setThemeDraft(nextDraft);
    setSavingTheme(true);
    await patchSettings(
      {
        interactiveTheme: {
          surface: nextDraft.surface,
          surfaceTextColor: nextDraft.surfaceTextColor,
          brandNameColor: nextDraft.brandNameColor,
          itemsColor: nextDraft.itemsColor,
          categoryColor: nextDraft.categoryColor,
          priceColor: nextDraft.priceColor,
          menuCardColor: INTERACTIVE_MENU_PANEL_BG,
          currencySymbol: nextDraft.currencySymbol,
        },
      },
      "Theme reset to defaults",
    );
    setSavingTheme(false);
  };

  const cp =
    "h-9 w-9 shrink-0 cursor-pointer outline-none ring-neutral-900/5 focus-visible:ring-2 focus-visible:ring-neutral-300";

  const themeRow =
    "flex min-h-[3rem] items-center justify-between gap-4 rounded-xl border border-neutral-100 bg-neutral-50/60 px-4 py-3";

  if (!user) {
    return <ProfilePageSkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8 sm:px-6">
      <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
        <div className="mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8e8e8e]">Business logo</p>
          <p className="text-xs text-[#737373]">Square images look best. Max 2 MB. Saved to your account so it follows you on any device.</p>
        </div>
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-8">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#efefef] text-2xl font-semibold text-[#8e8e8e]">
              {avatarDataUrl ? <img src={avatarDataUrl} alt="Business logo" className="h-full w-full object-cover" /> : avatarLabel}
            </div>
            <div className="min-w-0 flex-1">
              {!editingBusinessName ? (
                <div className="flex min-w-0 items-center gap-1.5">
                  <p className="min-w-0 truncate text-base font-semibold text-[#262626]">{name}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShopName(user?.business_name || user?.shop_name || "");
                      setEditingBusinessName(true);
                    }}
                    className="shrink-0 rounded-lg p-1.5 text-[#737373] transition-colors hover:bg-[#f0f0f0] hover:text-[#262626]"
                    aria-label="Edit business name"
                    title="Edit business name"
                  >
                    <Icon icon="solar:pen-bold" className="text-lg" aria-hidden />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <input
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full min-w-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[#262626]"
                    placeholder="Your business name"
                    aria-label="Business name"
                    autoFocus
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSaveName}
                      disabled={savingName}
                      className="inline-flex items-center justify-center rounded-lg bg-[#171717] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {savingName ? "…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelBusinessNameEdit}
                      disabled={savingName}
                      className="inline-flex items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm font-semibold text-[#262626] hover:bg-[#fafafa] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {slugLine ? <p className="mt-0.5 truncate text-sm text-[#737373]">{slugLine}</p> : null}
              {showEmailUnderLogo ? (
                <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-[#737373]">
                  <Icon icon="solar:letter-outline" className="shrink-0 text-base opacity-80" aria-hidden />
                  <span className="truncate">{accountEmail}</span>
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 md:pt-0.5">
            <label
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[#fafafa] px-3 py-2 text-xs font-semibold text-[#262626] hover:bg-[#f2f2f2] ${savingLogo ? "pointer-events-none opacity-50" : ""}`}
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

      <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8e8e8e]">Public Menu link</p>
          </div>
        </div>
        <div className="mt-4">
          {menuUrl && !menuUrl.startsWith("Set ") ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch sm:gap-4">
              <input
                readOnly
                value={menuUrl}
                onFocus={(e) => e.target.select()}
                className="min-h-[2.75rem] min-w-0 cursor-text rounded-lg border border-[var(--app-border)] bg-[#fafafa] px-3 py-2.5 font-mono text-sm text-[var(--brand-e)] outline-none focus:border-[#b5b5b5] focus:ring-2 focus:ring-[#e8e8e8]"
                aria-label="Public menu URL"
              />
              <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:justify-end">
                <button
                  type="button"
                  onClick={copyMenuLink}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs font-semibold text-[#262626] hover:bg-[#f8f8f8] sm:flex-none"
                >
                  <Icon icon="solar:copy-outline" className="text-base" aria-hidden />
                  {copied ? "Copied ✓" : "Copy link"}
                </button>
                <a
                  href={menuUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs font-semibold text-[#262626] hover:bg-[#f8f8f8] sm:flex-none"
                >
                  <Icon icon="solar:square-arrow-right-up-linear" className="text-base" aria-hidden />
                  Open
                </a>
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-[#f3ddb9] bg-[#fff7ed] px-3 py-2 text-sm text-[#9a3412]">
              {menuUrl || "Create a business username to generate your public menu link."}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
        <div className="border-b border-neutral-100 pb-5">
          <h2 className="text-base font-semibold tracking-tight text-neutral-900">Guest menu colors</h2>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-neutral-500">
            For the interactive menu in the browser only—not PDFs. The category and item list uses a fixed dark
            panel so layout stays readable; colors below control page backdrop and text accents. Edit dishes in{" "}
            <Link to="/app/menu" className="font-semibold text-[var(--brand-e)] underline-offset-2 hover:underline">
              Menu studio
            </Link>
            .
          </p>
        </div>

        <div className="mt-6 grid gap-8">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Page</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3">
              <div className={themeRow}>
                <span className="text-sm font-medium text-neutral-700">Background</span>
                <input
                  type="color"
                  className={cp}
                  value={themeDraft.surface}
                  onChange={(e) => setThemeDraft((prev) => ({ ...prev, surface: e.target.value }))}
                  aria-label="Page background"
                />
              </div>
              <div className={themeRow}>
                <span className="text-sm font-medium text-neutral-700">Surface text</span>
                <input
                  type="color"
                  className={cp}
                  value={themeDraft.surfaceTextColor}
                  onChange={(e) => setThemeDraft((prev) => ({ ...prev, surfaceTextColor: e.target.value }))}
                  aria-label="Surface text"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Menu</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3">
              <div className={themeRow}>
                <span className="text-sm font-medium text-neutral-700">Brand title</span>
                <input
                  type="color"
                  className={cp}
                  value={themeDraft.brandNameColor}
                  onChange={(e) => setThemeDraft((prev) => ({ ...prev, brandNameColor: e.target.value }))}
                  aria-label="Brand title color"
                />
              </div>
              <div className={themeRow}>
                <span className="text-sm font-medium text-neutral-700">Items &amp; descriptions</span>
                <input
                  type="color"
                  className={cp}
                  value={themeDraft.itemsColor}
                  onChange={(e) => setThemeDraft((prev) => ({ ...prev, itemsColor: e.target.value }))}
                  aria-label="Items color"
                />
              </div>
              <div className={themeRow}>
                <span className="text-sm font-medium text-neutral-700">Categories</span>
                <input
                  type="color"
                  className={cp}
                  value={themeDraft.categoryColor}
                  onChange={(e) => setThemeDraft((prev) => ({ ...prev, categoryColor: e.target.value }))}
                  aria-label="Category headings color"
                />
              </div>
              <div className={themeRow}>
                <span className="text-sm font-medium text-neutral-700">Prices</span>
                <input
                  type="color"
                  className={cp}
                  value={themeDraft.priceColor}
                  onChange={(e) => setThemeDraft((prev) => ({ ...prev, priceColor: e.target.value }))}
                  aria-label="Prices color"
                />
              </div>
              <div className={`${themeRow} sm:col-span-2`}>
                <span className="text-sm font-medium text-neutral-700">Currency</span>
                <input
                  value={themeDraft.currencySymbol}
                  onChange={(e) => setThemeDraft((prev) => ({ ...prev, currencySymbol: e.target.value.slice(0, 6) }))}
                  className="w-full max-w-[8rem] rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-neutral-200 sm:max-w-[10rem]"
                  placeholder="Rs."
                  aria-label="Currency symbol"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 border-t border-neutral-100 pt-6 sm:grid-cols-2 sm:gap-4">
          <button
            type="button"
            onClick={handleSaveTheme}
            disabled={savingTheme}
            className="inline-flex min-h-[2.75rem] items-center justify-center rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:bg-neutral-800 disabled:opacity-50"
          >
            {savingTheme ? "Saving…" : "Save theme"}
          </button>
          <button
            type="button"
            onClick={handleResetThemeDefaults}
            disabled={savingTheme}
            className="inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-50"
          >
            <Icon icon="solar:restart-linear" className="text-lg text-neutral-600" aria-hidden />
            Reset to default
          </button>
        </div>
      </section>

      <div className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
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
