import { useMemo, useState } from "react";
import { createMenuForLocationApi, deleteMenuVersionApi, patchMenuApi } from "../pages/menu.api";
import ConfirmDialog from "../../../components/ConfirmDialog.jsx";
import { toast } from "sonner";
import {
  MAX_DRAFT_VERSIONS_PER_MENU,
  MAX_MENU_TITLE_LENGTH,
  MAX_VERSIONS_PER_MENU,
} from "../menuConstants.js";

function normalizePdfUrl(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  return s === "" ? null : s;
}

function hasContent(menu) {
  if (!menu) return false;
  if (normalizePdfUrl(menu.pdf_url)) return true;
  const c = menu.digital_menu?.categories;
  return Array.isArray(c) && c.length > 0;
}

function statusStyle(status) {
  if (status === "published") return "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200";
  if (status === "draft") return "bg-amber-100 text-amber-950 ring-1 ring-amber-200";
  if (status === "archived") return "bg-neutral-200 text-neutral-700 ring-1 ring-neutral-300";
  return "bg-neutral-100 text-neutral-700";
}

function statusLabel(status) {
  if (status === "published") return "LIVE";
  if (status === "draft") return "DRAFT";
  if (status === "archived") return "ARCHIVED";
  return "UNKNOWN";
}

function modeLabel(menu) {
  if (menu?.display_as === "pdf") return "PDF menu";
  if (menu?.display_as === "interactive") return "Interactive";
  if (normalizePdfUrl(menu?.pdf_url)) return "PDF menu";
  const c = menu?.digital_menu?.categories;
  if (Array.isArray(c) && c.length > 0) return "Interactive";
  return "No content";
}

function formatTimeAgo(ts) {
  if (!ts) return "just now";
  const d = new Date(ts);
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return "just now";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`;
  return `${Math.floor(diff / 86_400_000)} day ago`;
}

export default function MenuVersionManager({
  locationId,
  menuGroupId,
  menus,
  selectedMenuId,
  onSelectMenu,
  onMenusUpdated,
  creatingMenu,
  setCreatingMenu,
  requireMenuGroupId,
}) {
  const [newTitle, setNewTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [publishingId, setPublishingId] = useState(null);
  const [savingTitleId, setSavingTitleId] = useState(null);
  const [defaultSavingId, setDefaultSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [versionDeletePrompt, setVersionDeletePrompt] = useState(null);

  const atVersionCap = menus.length >= MAX_VERSIONS_PER_MENU;
  const orderedMenus = useMemo(() => {
    const rank = { published: 0, draft: 1, archived: 2 };
    return [...menus].sort((a, b) => {
      const ra = rank[a.status] ?? 99;
      const rb = rank[b.status] ?? 99;
      if (ra !== rb) return ra - rb;
      const aa = new Date(a.updated_at || 0).getTime();
      const bb = new Date(b.updated_at || 0).getTime();
      return bb - aa;
    });
  }, [menus]);

  const handleCreate = async () => {
    if (!locationId) return;
    if (requireMenuGroupId && !menuGroupId) {
      toast.error("Select a menu first");
      return;
    }
    const title =
      (newTitle || `Version ${menus.length + 1}`).trim().slice(0, MAX_MENU_TITLE_LENGTH) ||
      `Version ${menus.length + 1}`;
    setCreatingMenu(true);
    const body = {
      title,
      status: "draft",
      is_default: menus.length === 0,
      digital_menu: { categories: [] },
    };
    if (menuGroupId) body.menu_group_id = menuGroupId;
    const [data, err] = await createMenuForLocationApi(locationId, body);
    setCreatingMenu(false);
    if (err) {
      toast.error(err);
      return;
    }
    setNewTitle("");
    setShowCreate(false);
    await onMenusUpdated();
    if (data?.menu?.id) onSelectMenu(data.menu.id);
    toast.success("Version created — add content under Menu, then publish when ready.");
  };

  const handlePublish = async (menuId) => {
    setPublishingId(menuId);
    const [, err] = await patchMenuApi(menuId, { status: "published", is_default: true });
    setPublishingId(null);
    if (err) {
      toast.error(err);
      return;
    }
    await onMenusUpdated();
    onSelectMenu(menuId);
    toast.success("Public now — set as default when no schedule rule matches.");
  };

  const executeDeleteVersion = async () => {
    if (!versionDeletePrompt?.id) return false;
    const menuId = versionDeletePrompt.id;
    setDeletingId(menuId);
    const [, err] = await deleteMenuVersionApi(menuId);
    setDeletingId(null);
    if (err) {
      toast.error(err);
      return false;
    }
    await onMenusUpdated();
    if (selectedMenuId === menuId) {
      const next = menus.find((m) => m.id !== menuId);
      if (next) onSelectMenu(next.id);
    }
    toast.success("Version deleted");
    return true;
  };

  const handleSetDefault = async (menuId) => {
    setDefaultSavingId(menuId);
    const [, err] = await patchMenuApi(menuId, { is_default: true });
    setDefaultSavingId(null);
    if (err) {
      toast.error(err);
      return;
    }
    await onMenusUpdated();
    toast.success("Default version updated");
  };

  const handleRename = async (menuId, title) => {
    const t = String(title || "").trim().slice(0, MAX_MENU_TITLE_LENGTH);
    if (!t) {
      toast.error("Enter a version name");
      return;
    }
    setSavingTitleId(menuId);
    const [, err] = await patchMenuApi(menuId, { title: t });
    setSavingTitleId(null);
    if (err) {
      toast.error(err);
      return;
    }
    await onMenusUpdated();
    toast.success("Name saved");
  };

  if (!locationId) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-[#171717]">Versions (max {MAX_VERSIONS_PER_MENU})</h3>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#525252]">
            Keep up to <strong>1 public/live + {MAX_DRAFT_VERSIONS_PER_MENU} drafts</strong> per menu. Each
            version is either PDF or interactive; edits move it back to draft until you publish again.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setNewTitle(`Version ${menus.length + 1}`);
            setShowCreate(true);
          }}
          disabled={creatingMenu || atVersionCap || (requireMenuGroupId && !menuGroupId)}
          title={atVersionCap ? `Maximum ${MAX_VERSIONS_PER_MENU} versions per menu group` : undefined}
          className="shrink-0 rounded-xl bg-[#171717] px-4 py-2.5 text-sm font-bold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {creatingMenu ? "Creating…" : "+ New version"}
        </button>
      </div>

      {showCreate ? (
        <div className="rounded-2xl border border-[#e5e5e5] bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
          <p className="text-sm font-semibold text-[#262626]">Version name</p>
          <p className="mt-1 text-xs text-[#737373]">e.g. Lunch service, Weekend, Holiday 2026.</p>
          <input
            type="text"
            value={newTitle}
            maxLength={MAX_MENU_TITLE_LENGTH}
            onChange={(e) => setNewTitle(e.target.value)}
            className="mt-3 w-full rounded-xl border border-[#d4d4d4] bg-[#fafafa] px-3 py-2.5 text-sm outline-none focus:border-(--brand-e) focus:ring-2 focus:ring-[#bbf7d0]"
            placeholder="Menu name"
            autoFocus
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-xl border border-[#e5e5e5] bg-white px-4 py-2 text-sm font-semibold text-[#404040] hover:bg-[#fafafa]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creatingMenu}
              className="rounded-xl bg-(--brand-e) px-4 py-2 text-sm font-bold text-white hover:bg-(--brand-e-dark) disabled:opacity-40"
            >
              {creatingMenu ? "Creating…" : "Create version"}
            </button>
          </div>
        </div>
      ) : null}

      {orderedMenus.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d4d4d4] bg-[#fafafa] px-4 py-10 text-center">
          <p className="text-sm font-medium text-[#404040]">No versions yet</p>
          <p className="mt-1 text-xs text-[#737373]">Create a version, then add your PDF or interactive menu under Menu.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {orderedMenus.map((m, index) => {
            const selected = m.id === selectedMenuId;
            const busy =
              publishingId === m.id ||
              savingTitleId === m.id ||
              defaultSavingId === m.id ||
              deletingId === m.id;
            return (
              <li
                key={m.id}
                className={`rounded-2xl border p-4 shadow-sm transition-shadow ${
                  selected
                    ? "border-(--brand-e) bg-white ring-2 ring-[#bbf7d0]"
                    : "border-[#e5e5e5] bg-white hover:border-[#d4d4d4]"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${statusStyle(m.status)}`}>
                        {statusLabel(m.status)}
                      </span>
                        {m.is_default ? (
                        <span className="rounded-full bg-[#f0fdf4] px-2.5 py-0.5 text-[11px] font-bold text-[#166534] ring-1 ring-[#bbf7d0]">
                          Default
                        </span>
                      ) : null}
                    </div>
                    <label className="block">
                      <span className="sr-only">Version name</span>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="text"
                          defaultValue={m.title || "Menu"}
                          key={m.id + (m.title || "")}
                          maxLength={MAX_MENU_TITLE_LENGTH}
                          readOnly={m.status === "published"}
                          title={m.status === "published" ? "Published version name is locked" : undefined}
                          disabled={busy || m.status === "published"}
                          onBlur={(e) => {
                            const next = e.target.value.trim().slice(0, MAX_MENU_TITLE_LENGTH);
                            if (next && next !== (m.title || "").trim()) handleRename(m.id, next);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.target.blur();
                          }}
                          className="w-full max-w-md rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-sm font-semibold text-[#171717] outline-none focus:border-(--brand-e) disabled:opacity-50"
                        />
                        {savingTitleId === m.id ? (
                          <span className="text-xs text-[#737373]">Saving…</span>
                        ) : null}
                      </div>
                    </label>
                    <p className="text-xs text-[#737373]">
                      {modeLabel(m)} · Saved {formatTimeAgo(m.updated_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:shrink-0 sm:flex-col sm:items-stretch">
                    <button
                      type="button"
                      onClick={() => onSelectMenu(m.id)}
                      className={`rounded-xl px-4 py-2 text-sm font-bold ${
                        selected
                          ? "bg-[#ecfdf5] text-[#065f46] ring-1 ring-[#a7f3d0]"
                          : "border border-[#e5e5e5] bg-white text-[#262626] hover:bg-[#fafafa]"
                      }`}
                    >
                      {selected ? "Viewing" : "View"}
                    </button>
                    {!m.is_default ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleSetDefault(m.id)}
                        className="rounded-xl border border-[#e5e5e5] bg-white px-4 py-2 text-sm font-semibold text-[#404040] hover:bg-[#fafafa] disabled:opacity-40"
                      >
                        {defaultSavingId === m.id ? "…" : "Set as default"}
                      </button>
                    ) : null}
                    {m.status !== "published" ? (
                      <button
                        type="button"
                        disabled={busy || !hasContent(m)}
                        title={!hasContent(m) ? "Add a PDF or at least one category with dishes first" : undefined}
                        onClick={() => handlePublish(m.id)}
                        className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {publishingId === m.id ? "Publishing…" : m.status === "archived" ? "Re-publish" : "Publish"}
                      </button>
                    ) : null}
                    {menus.length > 1 ? (
                      <button
                        type="button"
                        disabled={busy || m.status === "published"}
                        title={m.status === "published" ? "Cannot delete live version" : undefined}
                        onClick={() => setVersionDeletePrompt({ id: m.id, title: m.title || "Version" })}
                        className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-[#b42318] hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {deletingId === m.id ? "…" : "Delete version"}
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-neutral-500">Version {menus.length - index}</p>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(versionDeletePrompt)}
        onClose={() => setVersionDeletePrompt(null)}
        title="Delete this version?"
        description={
          versionDeletePrompt
            ? `“${versionDeletePrompt.title}” will be permanently removed. Schedules for this menu group still apply to other versions.`
            : ""
        }
        confirmLabel="Delete version"
        loading={Boolean(deletingId)}
        onConfirm={async () => {
          const ok = await executeDeleteVersion();
          if (ok) setVersionDeletePrompt(null);
        }}
      />
    </div>
  );
}
