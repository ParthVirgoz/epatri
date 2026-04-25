import { useState } from "react";
import { createMenuGroupApi, deleteMenuGroupApi } from "../pages/menu.api";
import ConfirmDialog from "../../../components/ConfirmDialog.jsx";
import { toast } from "sonner";
import { MAX_MENU_GROUPS_PER_LOCATION, MAX_MENU_TITLE_LENGTH } from "../menuConstants.js";

export default function MenuGroupBar({
  locationId,
  menuGroups,
  selectedGroupId,
  onSelectGroup,
  onStructureUpdated,
  hasMenuGroupsTable,
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [menuTitle, setMenuTitle] = useState("");
  const [v1Title, setV1Title] = useState("Version 1");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletePrompt, setDeletePrompt] = useState(null);

  const handleCreateMenu = async () => {
    const t = (menuTitle || "New menu").trim() || "New menu";
    if (!locationId) return;
    setCreating(true);
    const [data, err] = await createMenuGroupApi(locationId, {
      title: t,
      first_version_title: (v1Title || "Version 1").trim() || "Version 1",
    });
    setCreating(false);
    if (err) {
      toast.error(err);
      return;
    }
    setMenuTitle("");
    setV1Title("Version 1");
    setShowAdd(false);
    await onStructureUpdated();
    if (data?.group?.id) onSelectGroup(data.group.id);
    toast.success("Menu added — set the schedule, then add content under Menu.");
  };

  const executeDeleteGroup = async () => {
    if (!deletePrompt?.id) return false;
    setDeletingId(deletePrompt.id);
    const [, err] = await deleteMenuGroupApi(deletePrompt.id);
    setDeletingId(null);
    if (err) {
      toast.error(err);
      return false;
    }
    await onStructureUpdated();
    toast.success("Menu removed");
    return true;
  };

  if (!locationId || !hasMenuGroupsTable) return null;

  return (
    <div className="mb-6 space-y-4 rounded-2xl border border-[#e5e5e5] bg-white p-4 shadow-sm ring-1 ring-black/4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-[#171717]">Menus for this outlet</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[#525252]">
            Up to <strong>{MAX_MENU_GROUPS_PER_LOCATION}</strong> menus per outlet (e.g. lunch, dinner). Each has its own{" "}
            <strong>Schedule</strong> and up to five <strong>Versions</strong>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMenuTitle(`Menu ${menuGroups.length + 1}`);
            setShowAdd(true);
          }}
          disabled={creating || menuGroups.length >= MAX_MENU_GROUPS_PER_LOCATION}
          title={
            menuGroups.length >= MAX_MENU_GROUPS_PER_LOCATION
              ? `Maximum ${MAX_MENU_GROUPS_PER_LOCATION} menus per outlet`
              : undefined
          }
          className="shrink-0 rounded-xl bg-[#171717] px-4 py-2.5 text-sm font-bold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Add menu
        </button>
      </div>

      {showAdd ? (
        <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4">
          <p className="text-sm font-semibold text-[#262626]">New menu</p>
          <p className="mt-1 text-xs text-[#737373]">e.g. Lunch, Weekend, Happy hour.</p>
          <label className="mt-3 block text-xs font-semibold text-[#525252]">Name</label>
          <input
            type="text"
            value={menuTitle}
            maxLength={MAX_MENU_TITLE_LENGTH}
            onChange={(e) => setMenuTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2 text-sm"
            placeholder="Daily menu"
          />
          <label className="mt-2 block text-xs font-semibold text-[#525252]">First version name</label>
          <input
            type="text"
            value={v1Title}
            maxLength={MAX_MENU_TITLE_LENGTH}
            onChange={(e) => setV1Title(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2 text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={creating}
              onClick={handleCreateMenu}
              className="rounded-lg bg-(--brand-e) px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {menuGroups.map((g) => {
          const active = g.id === selectedGroupId;
          return (
            <div
              key={g.id}
              className={`flex items-center gap-1 rounded-xl border-2 pl-3 pr-1 py-1.5 transition-colors ${
                active ? "border-(--brand-e) bg-[#ecfdf5]" : "border-[#e5e5e5] bg-[#fafafa]"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectGroup(g.id)}
                className={`min-h-[40px] px-2 py-1 text-left text-sm font-semibold ${
                  active ? "text-[#065f46]" : "text-[#262626]"
                }`}
              >
                {g.title || "Menu"}
              </button>
              <button
                type="button"
                title="Delete this menu"
                disabled={deletingId === g.id || menuGroups.length <= 1}
                onClick={() => setDeletePrompt({ id: g.id, title: g.title || "Menu" })}
                className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[#b42318] hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {deletingId === g.id ? "…" : "×"}
              </button>
            </div>
          );
        })}
      </div>
      {menuGroups.length <= 1 ? (
        <p className="text-xs text-[#737373]">You need at least one menu. Add another for offers or events, each with its own timing.</p>
      ) : null}

      <ConfirmDialog
        open={Boolean(deletePrompt)}
        onClose={() => setDeletePrompt(null)}
        title="Delete this menu?"
        description={
          deletePrompt
            ? `“${deletePrompt.title}” and every version and schedule tied to it will be removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete menu"
        loading={Boolean(deletingId)}
        onConfirm={async () => {
          const ok = await executeDeleteGroup();
          if (ok) setDeletePrompt(null);
        }}
      />
    </div>
  );
}
