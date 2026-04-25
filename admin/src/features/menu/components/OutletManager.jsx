import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createMyLocationApi } from "../pages/menu.api";
import LocationPlaceSearch from "../../onboarding/components/LocationPlaceSearch.jsx";
import { toast } from "sonner";

function toSlug(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function emptyRow() {
  return {
    name: "",
    geo: null,
  };
}

function hasRequiredLocation(v) {
  return (
    v?.latitude != null &&
    v?.longitude != null &&
    Number.isFinite(Number(v.latitude)) &&
    Number.isFinite(Number(v.longitude)) &&
    String(v?.address_text || "").trim().length > 0
  );
}

export default function OutletManager({ locations, onCreated, layout = "card", brandName = "" }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const canSubmit = useMemo(
    () =>
      rows.length > 0 &&
      rows.every(
        (r) => String(r.name || "").trim().length > 0 && hasRequiredLocation(r.geo)
      ),
    [rows]
  );

  const updateRow = (idx, patch) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (idx) => {
    setRows((prev) => {
      if (prev.length <= 1) return [emptyRow()];
      return prev.filter((_, i) => i !== idx);
    });
  };

  const closeModal = () => {
    if (saving) return;
    setOpen(false);
  };

  const resetForm = () => {
    setRows([emptyRow()]);
  };

  const handleCreateMany = async () => {
    const prepared = rows.map((r) => ({
      name: String(r.name || "").trim(),
      slug: toSlug(r.name),
      latitude: r.geo?.latitude ?? null,
      longitude: r.geo?.longitude ?? null,
      address_text: String(r.geo?.address_text || "").trim() || null,
    }));

    const invalidIndex = prepared.findIndex(
      (r) =>
        !r.name ||
        !Number.isFinite(Number(r.latitude)) ||
        !Number.isFinite(Number(r.longitude)) ||
        !r.address_text
    );
    if (invalidIndex >= 0) {
      const text = `Outlet ${invalidIndex + 1}: enter outlet name and full location (landmark + latitude + longitude).`;
      setMsg({ type: "err", text });
      toast.error(text);
      return;
    }

    setSaving(true);
    setMsg(null);

    let created = 0;
    for (let i = 0; i < prepared.length; i += 1) {
      const body = prepared[i];
      const [, err] = await createMyLocationApi(body);
      if (err) {
        const text = prepared.length > 1 ? `Outlet ${i + 1}: ${err}` : err;
        setMsg({ type: "err", text });
        toast.error(text);
        setSaving(false);
        return;
      }
      created += 1;
    }

    setSaving(false);
    setOpen(false);
    resetForm();
    const text = created === 1 ? "Outlet added." : `${created} outlets added.`;
    setMsg({ type: "ok", text });
    toast.success(text);
    onCreated?.();
  };

  const isSidebar = layout === "sidebar";
  const canPortal = typeof document !== "undefined";

  useEffect(() => {
    if (!open || !canPortal) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open, canPortal]);

  const modalNode = open ? (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/45 p-4">
      <div
        className="absolute inset-0"
        aria-hidden
        onClick={closeModal}
      />
      <div
        className="relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Add outlet details"
      >
        <div className="flex items-center justify-between border-b border-[#ececec] px-5 py-4">
          <div>
            <p className="text-base font-bold text-[#171717]">Add outlet details</p>
            <p className="text-xs text-[#6b7280]">Fill one or multiple outlets, then create them together.</p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg border border-[#dbdbdb] bg-white px-3 py-1.5 text-xs font-semibold text-[#374151] hover:bg-[#fafafa]"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-4">
            {rows.map((row, idx) => (
              <div key={idx} className="space-y-2 rounded-xl border border-[#e5e7eb] bg-[#fbfbfb] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Outlet {idx + 1}</p>
                  {rows.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="rounded-md border border-(--brand-patri)/35 bg-(--brand-patri-muted) px-2 py-1 text-[11px] font-semibold text-(--brand-patri-dark) hover:bg-(--brand-patri)/20"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
                <input
                  value={row.name}
                  onChange={(e) => updateRow(idx, { name: e.target.value })}
                  placeholder="Outlet name"
                  className="w-full rounded-lg border border-[#dbdbdb] bg-white px-3 py-2 text-sm"
                />
                <LocationPlaceSearch
                  inputId={`menu-outlet-location-${idx}`}
                  value={row.geo}
                  onChange={(geo) => updateRow(idx, { geo })}
                  brandName={brandName}
                  outletName={row.name}
                />
              </div>
            ))}
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={addRow}
              className="rounded-lg border border-dashed border-[#c5c5c5] bg-white px-4 py-2 text-sm font-semibold text-(--brand-e) hover:border-(--brand-e)/50 hover:bg-emerald-50/50"
            >
              + Add another outlet row
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#ececec] px-5 py-4">
          <p className="text-xs text-[#6b7280]">Every row needs outlet name + landmark + latitude + longitude.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-[#dbdbdb] bg-white px-3 py-2 text-sm font-semibold text-[#374151] hover:bg-[#fafafa]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateMany}
              disabled={saving || !canSubmit}
              className="rounded-lg bg-(--brand-e) px-4 py-2 text-sm font-semibold text-white hover:bg-(--brand-e-dark) disabled:opacity-40"
            >
              {saving ? "Creating..." : rows.length > 1 ? `Create ${rows.length} outlets` : "Create outlet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div
      className={
        isSidebar
          ? "space-y-2"
          : "space-y-2 rounded-xl border border-[#dbdbdb] bg-white p-3 shadow-sm"
      }
    >
      <div className={isSidebar ? "space-y-2" : "flex items-center justify-between gap-2"}>
        {!isSidebar ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8e8e8e]">Outlets</p>
              <p className="text-xs text-[#8e8e8e]">{locations.length} total. Add one or many outlets in one flow.</p>
          </div>
        ) : null}
        <button
          type="button"
            onClick={() => setOpen(true)}
          className={
            isSidebar
              ? "w-full rounded-xl bg-(--brand-e) py-3 text-sm font-bold text-white shadow-sm hover:bg-(--brand-e-dark)"
              : "rounded-lg border border-[#dbdbdb] bg-white px-3 py-1.5 text-xs font-semibold text-[#262626] hover:bg-[#fafafa]"
          }
        >
            + Add new outlet
        </button>
      </div>

      {msg ? (
        <div
          className={`rounded border px-2 py-1.5 text-xs ${
            msg.type === "ok"
              ? "border-(--brand-e)/35 bg-(--brand-e-muted) text-(--brand-e-dark)"
              : "border-(--brand-patri)/35 bg-(--brand-patri-muted) text-(--brand-patri-dark)"
          }`}
        >
          {msg.text}
        </div>
      ) : null}

      {canPortal ? createPortal(modalNode, document.body) : modalNode}
    </div>
  );
}
