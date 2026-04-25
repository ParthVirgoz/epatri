import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import {
  MAX_DIGITAL_DESCRIPTION_LENGTH,
  MAX_DIGITAL_ITEMS_PER_CATEGORY,
  MAX_DIGITAL_NAME_LENGTH,
  MAX_DIGITAL_PRICE_LENGTH,
  MAX_DIGITAL_CATEGORIES,
} from "../menuConstants.js";

function normalize(input) {
  const cats = Array.isArray(input?.categories) ? input.categories : [];
  return {
    categories: cats.map((c) => ({
      name: c?.name || "",
      items: Array.isArray(c?.items)
        ? c.items.map((i) => ({
          name: i?.name || "",
          description: i?.description || "",
          price: i?.price ?? "",
        }))
        : [],
    })),
  };
}

export default function DigitalMenuBuilder({ value, onChange }) {
  const model = useMemo(() => normalize(value || {}), [value]);
  const [dragCategoryIndex, setDragCategoryIndex] = useState(null);
  const [dragItem, setDragItem] = useState(null);
  const [showDescriptions, setShowDescriptions] = useState(true);

  const setModel = (next) => onChange?.(normalize(next));

  const addCategory = () => {
    if (model.categories.length >= MAX_DIGITAL_CATEGORIES) return;
    setModel({ ...model, categories: [...model.categories, { name: "", items: [] }] });
  };
  const updateCategory = (idx, patch) => {
    setModel({
      ...model,
      categories: model.categories.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    });
  };
  const removeCategory = (idx) => setModel({ ...model, categories: model.categories.filter((_, i) => i !== idx) });

  const addItem = (idx) => {
    const c = model.categories[idx];
    const items = c.items || [];
    if (items.length >= MAX_DIGITAL_ITEMS_PER_CATEGORY) return;
    updateCategory(idx, { items: [...items, { name: "", description: "", price: "" }] });
  };
  const updateItem = (cidx, iidx, patch) => {
    const c = model.categories[cidx];
    const items = (c.items || []).map((it, i) => (i === iidx ? { ...it, ...patch } : it));
    updateCategory(cidx, { items });
  };
  const removeItem = (cidx, iidx) => {
    const c = model.categories[cidx];
    updateCategory(cidx, { items: (c.items || []).filter((_, i) => i !== iidx) });
  };

  const moveCategory = (from, to) => {
    if (from == null || to == null || from === to) return;
    const next = [...model.categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setModel({ ...model, categories: next });
  };

  const moveItem = (fromCidx, fromIidx, toCidx, toIidx) => {
    if (fromCidx == null || fromIidx == null || toCidx == null || toIidx == null) return;
    const nextCats = model.categories.map((cat) => ({ ...cat, items: [...(cat.items || [])] }));
    const [moved] = nextCats[fromCidx].items.splice(fromIidx, 1);
    nextCats[toCidx].items.splice(toIidx, 0, moved);
    setModel({ ...model, categories: nextCats });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowDescriptions((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            showDescriptions ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[#dddddd] bg-white text-[#5f5f5f]"
          }`}
        >
          <Icon icon={showDescriptions ? "solar:eye-bold" : "solar:eye-closed-bold"} className="text-sm" aria-hidden />
          Description {showDescriptions ? "On" : "Off"}
        </button>
      </div>

      {model.categories.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#dddddd] bg-[#f5f5f5] px-3 py-3 text-xs text-[#8e8e8e]">
          Start by adding a section like Starters, Mains, or Drinks.
        </p>
      ) : null}

      {model.categories.map((cat, cidx) => (
        <div
          key={cidx}
          className={`space-y-2 rounded-2xl border bg-[#efefef] p-3 sm:p-4 ${dragCategoryIndex === cidx ? "border-[#0b8a5a]/40 ring-2 ring-[#0b8a5a]/15" : "border-[#e9e9e9]"
            }`}
          draggable
          onDragStart={() => setDragCategoryIndex(cidx)}
          onDragEnd={() => setDragCategoryIndex(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            moveCategory(dragCategoryIndex, cidx);
            setDragCategoryIndex(null);
          }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex w-full items-center gap-2 sm:flex-1">
              <Icon icon="solar:hamburger-menu-outline" className="text-lg text-[#1f1f1f]" aria-hidden />
              <input
                value={cat.name}
                maxLength={MAX_DIGITAL_NAME_LENGTH}
                onChange={(e) => updateCategory(cidx, { name: e.target.value })}
                placeholder="Section name"
                className="min-w-0 w-full flex-1 rounded-lg border border-[#dddddd] bg-white px-3 py-2 text-sm font-semibold text-[#262626]"
              />
            </div>
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:justify-start">
              <span className="hidden md:block shrink-0 rounded-md bg-[#e4e4e4] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#4f4f4f]">
                {(cat.items || []).length} items
              </span>
              <button
                type="button"
                onClick={() => removeCategory(cidx)}
                className="col-span-2 inline-flex items-center justify-center justify-self-end rounded border border-[#ffd9d9] px-2 py-2 text-[11px] font-semibold text-[#b42318] sm:col-span-1"
                title="Delete category"
              >
                <Icon icon="solar:trash-bin-trash-outline" className="text-base" aria-hidden />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {(cat.items || []).map((item, iidx) => (
              <div
                key={iidx}
                className={`rounded-xl border bg-white p-3 ${dragItem?.cidx === cidx && dragItem?.iidx === iidx
                    ? "border-[#0b8a5a]/40 ring-2 ring-[#0b8a5a]/15"
                    : "border-[#e6e6e6]"
                  }`}
                draggable
                onDragStart={() => setDragItem({ cidx, iidx })}
                onDragEnd={() => setDragItem(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!dragItem) return;
                  moveItem(dragItem.cidx, dragItem.iidx, cidx, iidx);
                  setDragItem(null);
                }}
              >
                <div className="grid grid-cols-[auto_1fr] gap-2 sm:grid-cols-[auto_1fr_auto_auto] sm:items-start">
                  <Icon icon="solar:hamburger-menu-outline" className="pt-2 text-xl text-[#1f1f1f]" aria-hidden />
                  <div className="space-y-3">
                    <input
                      value={item.name}
                      maxLength={MAX_DIGITAL_NAME_LENGTH}
                      onChange={(e) => updateItem(cidx, iidx, { name: e.target.value })}
                      placeholder="Write item name on this line"
                      className="w-full border-0 border-b border-gray-200 bg-transparent px-0 py-1.5 text-sm font-semibold outline-none shadow-none focus:!border-0 focus:!border-b-2 focus:border-b-green-600 focus:outline-0 focus:ring-0 focus:shadow-none focus-visible:!outline-0"
                    />
                    {showDescriptions ? (
                      <input
                        value={item.description}
                        maxLength={MAX_DIGITAL_DESCRIPTION_LENGTH}
                        onChange={(e) => updateItem(cidx, iidx, { description: e.target.value })}
                        placeholder="Write description on this line"
                        className="w-full border-0 border-b border-gray-200 bg-transparent px-0 py-1.5 text-xs text-[#5f5f5f] outline-none shadow-none focus:!border-0 focus:!border-b-2 focus:border-b-green-600 focus:outline-0 focus:ring-0 focus:shadow-none focus-visible:!outline-0"
                      />
                    ) : null}
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2 sm:col-span-1 sm:justify-start">
                    <input
                      value={item.price}
                      maxLength={MAX_DIGITAL_PRICE_LENGTH}
                      onChange={(e) => updateItem(cidx, iidx, { price: e.target.value })}
                      placeholder="Price"
                      className="w-20 border-0 border-b border-gray-200 bg-transparent px-0 py-1.5 text-right text-sm font-semibold outline-none shadow-none focus:!border-0 focus:!border-b-2 focus:border-b-green-600 focus:outline-0 focus:ring-0 focus:shadow-none focus-visible:!outline-0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(cidx, iidx)}
                    className="col-span-2 inline-flex items-center justify-center justify-self-end rounded border border-[#ffd9d9] px-2 py-2 text-[11px] font-semibold text-[#b42318] sm:col-span-1"
                    title="Delete item"
                  >
                    <Icon icon="solar:trash-bin-trash-outline" className="text-base" aria-hidden />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addItem(cidx)}
              disabled={(cat.items || []).length >= MAX_DIGITAL_ITEMS_PER_CATEGORY}
              className="w-full rounded-lg border border-dashed border-[#d0d0d0] bg-white px-3 py-2.5 text-sm font-semibold uppercase tracking-wide text-[#3d4e45] disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Add item to {String(cat.name || "section").trim() || "section"}
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addCategory}
        disabled={model.categories.length >= MAX_DIGITAL_CATEGORIES}
        className="w-full rounded-xl border border-[#d8d8d8] bg-[#e9e9e9] px-3 py-3 text-sm font-semibold text-[#0b8a5a] disabled:cursor-not-allowed disabled:opacity-40"
      >
        + Add category
      </button>
    </div>
  );
}
