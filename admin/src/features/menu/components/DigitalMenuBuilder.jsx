import { Fragment, useEffect, useMemo, useState } from "react";
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

/** Underline field style (line inputs). */
const lineInput =
  "w-full border-0 border-b border-neutral-500/30 bg-transparent px-0 py-1.5 outline-none shadow-none " +
  "focus:border-b-2 focus:border-b-[#16a34a] focus:outline-none focus:ring-0 focus-visible:!outline-0";

const lineInputPrice =
  "w-full min-w-[4.5rem] border-0 border-b border-neutral-500/30 bg-transparent px-0 py-1.5 text-right text-sm font-semibold outline-none " +
  "focus:border-b-2 focus:border-b-[#16a34a] focus:outline-none focus:ring-0 focus-visible:!outline-0";

/** Notes: ruled lines per row so multi-line descriptions read clearly (lined paper effect). */
const lineTextarea =
  "w-full resize-none border-0 bg-transparent px-0 py-1.5 text-xs text-neutral-600 outline-none " +
  "leading-6 sm:leading-7 " +
  "[background-image:linear-gradient(to_top,rgb(115_115_115/0.22)_1px,transparent_1px)] " +
  "[background-size:100%_1.5rem] sm:[background-size:100%_1.75rem] " +
  "[background-attachment:local] " +
  "focus:outline-none focus:ring-0 focus-visible:!outline-0 " +
  "focus:[background-image:linear-gradient(to_top,rgb(22_163_74/0.38)_1px,transparent_1px)]";

/**
 * `slotBeforeOriginal` = insert-before index in the destination category (0..length),
 * using indices from before the move (length = append after last item).
 */
function moveItemToSlot(categories, fromCidx, fromIidx, toCidx, slotBeforeOriginal) {
  const nextCats = categories.map((cat) => ({ ...cat, items: [...(cat.items || [])] }));
  const destLenBefore = nextCats[toCidx].items.length;
  const slot = Math.max(0, Math.min(Number(slotBeforeOriginal) || 0, destLenBefore));

  const [moved] = nextCats[fromCidx].items.splice(fromIidx, 1);

  let p = slot;
  if (fromCidx === toCidx && fromIidx < slot) {
    p -= 1;
  }
  p = Math.max(0, Math.min(p, nextCats[toCidx].items.length));
  nextCats[toCidx].items.splice(p, 0, moved);
  return nextCats;
}

function useDescriptionRows() {
  const [rows, setRows] = useState(1);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () => setRows(mq.matches ? 2 : 1);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return rows;
}

export default function DigitalMenuBuilder({ value, onChange }) {
  const model = useMemo(() => normalize(value || {}), [value]);
  const [dragCategoryIndex, setDragCategoryIndex] = useState(null);
  const [categoryDropSlot, setCategoryDropSlot] = useState(null);
  const [dragItem, setDragItem] = useState(null);
  const [itemDropSlot, setItemDropSlot] = useState(null);
  const [showDescriptions, setShowDescriptions] = useState(true);
  const descriptionRows = useDescriptionRows();

  /** Desktop: no Notes toggle — descriptions stay visible. */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () => {
      if (mq.matches) setShowDescriptions(true);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

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
    let insert = to;
    if (from < insert) insert -= 1;
    insert = Math.max(0, Math.min(insert, next.length));
    next.splice(insert, 0, moved);
    setModel({ ...model, categories: next });
  };

  const moveItem = (fromCidx, fromIidx, toCidx, toIidx) => {
    if (fromCidx == null || fromIidx == null || toCidx == null || toIidx == null) return;
    const nextCats = moveItemToSlot(model.categories, fromCidx, fromIidx, toCidx, toIidx);
    setModel({ ...model, categories: nextCats });
  };

  const moveItemUp = (cidx, iidx) => {
    if (iidx <= 0) return;
    moveItem(cidx, iidx, cidx, iidx - 1);
  };

  const moveItemDown = (cidx, iidx) => {
    const len = model.categories[cidx]?.items?.length || 0;
    if (iidx >= len - 1) return;
    // "Insert before" index iidx+2 == after current neighbour (end = len+1 is clamped).
    moveItem(cidx, iidx, cidx, iidx + 2);
  };

  const endItemDrag = () => {
    setDragItem(null);
    setItemDropSlot(null);
  };

  const endCategoryDrag = () => {
    setDragCategoryIndex(null);
    setCategoryDropSlot(null);
  };

  const onItemDropAtSlot = (toCidx, slotIndex) => {
    if (!dragItem) return;
    const next = moveItemToSlot(model.categories, dragItem.cidx, dragItem.iidx, toCidx, slotIndex);
    setModel({ ...model, categories: next });
    endItemDrag();
  };

  /** Slot from pointer Y relative to a row (same rules as drag-over). */
  const itemSlotFromClientY = (cidx, iidx, clientY, rowEl) => {
    const rect = rowEl.getBoundingClientRect();
    const before = clientY < rect.top + rect.height / 2;
    return before ? iidx : iidx + 1;
  };

  const ItemDropIndicator = ({ cidx, slotIndex }) => {
    const active = itemDropSlot?.cidx === cidx && itemDropSlot?.slot === slotIndex;
    const showTrack = Boolean(dragItem);
    return (
      <div
        role="presentation"
        className={`relative z-1 flex items-center justify-center transition ${showTrack ? "-my-0.5 min-h-7 py-1" : "-my-1 min-h-4"
          } ${active ? "opacity-100" : showTrack ? "opacity-40" : "opacity-0 hover:opacity-100"}`}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "move";
          if (dragItem) setItemDropSlot({ cidx, slot: slotIndex });
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onItemDropAtSlot(cidx, slotIndex);
        }}
      >
        <div
          className={`h-1 w-full rounded-full transition ${active ? "bg-[#16a34a] shadow-[0_0_0_3px_rgba(22,163,74,0.2)]" : showTrack ? "bg-neutral-200/80" : "bg-transparent"
            }`}
        />
        <span className="sr-only">Drop item at position {slotIndex + 1}</span>
      </div>
    );
  };

  const CategoryDropIndicator = ({ slotIndex }) => {
    const active = categoryDropSlot === slotIndex;
    const showTrack = dragCategoryIndex != null;
    return (
      <div
        role="presentation"
        className={`flex items-center justify-center transition ${showTrack ? "-my-0.5 min-h-6 py-1" : "-my-0.5 min-h-3"
          } ${active ? "opacity-100" : showTrack ? "opacity-50" : "opacity-0"}`}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "move";
          if (dragCategoryIndex != null) setCategoryDropSlot(slotIndex);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (dragCategoryIndex == null) return;
          moveCategory(dragCategoryIndex, slotIndex);
          endCategoryDrag();
        }}
      >
        <div className={`h-0.5 w-full rounded-full ${active ? "bg-[#16a34a]" : showTrack ? "bg-neutral-200/80" : "bg-transparent"}`} />
      </div>
    );
  };

  return (
    <div
      className="space-y-4"
      onDragOver={(e) => {
        if (dragItem || dragCategoryIndex != null) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }
      }}
    >
      <div className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-neutral-50/80 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 py-1">Interactive menu</p>
        <button
          type="button"
          onClick={() => setShowDescriptions((v) => !v)}
          className={`inline-flex sm:hidden items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold ${showDescriptions ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-neutral-200 bg-white text-neutral-600"}`}
        >
          <Icon icon={showDescriptions ? "solar:eye-bold" : "solar:eye-closed-bold"} className="text-sm" aria-hidden />
          Notes {showDescriptions ? "On" : "Off"}
        </button>
      </div>

      {model.categories.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-3 py-4 text-xs text-neutral-500">
          Start by adding a section like Starters, Mains, or Drinks.
        </p>
      ) : null}

      <CategoryDropIndicator slotIndex={0} />

      {model.categories.map((cat, cidx) => (
        <Fragment key={cidx}>
          {/* Section / item shells use fixed brand-tinted neutrals (not guest-menu theme colors). */}
          <div
            className={`touch-manipulation space-y-3 rounded-2xl border bg-brand-patri/10 px-2 py-3 shadow-sm sm:p-4 ${dragCategoryIndex === cidx ? "border-emerald-400/60 ring-2 ring-emerald-200/50" : "border-neutral-200"
              } ${dragItem?.cidx === cidx ? "ring-1 ring-neutral-200" : ""}`}
            onDragOver={(e) => {
              if (dragItem || dragCategoryIndex != null) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }
            }}
          >
            <div className="flex items-start gap-2 border-b border-neutral-100 pb-2">
              <span
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", `cat-${cidx}`);
                  setDragCategoryIndex(cidx);
                }}
                onDragEnd={endCategoryDrag}
                className="mt-0.5 inline-flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 active:cursor-grabbing"
                role="button"
                tabIndex={0}
                aria-label="Drag to reorder section"
                title="Drag section"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") e.preventDefault();
                }}
              >
                <Icon icon="solar:hamburger-menu-outline" className="text-lg" aria-hidden />
              </span>
              <input
                draggable={false}
                value={cat.name}
                maxLength={MAX_DIGITAL_NAME_LENGTH}
                onChange={(e) => updateCategory(cidx, { name: e.target.value })}
                placeholder="Section name"
                className={`min-w-0 flex-1 text-sm font-semibold text-neutral-900 ${lineInput}`}
              />
              <span className="hidden shrink-0 self-center rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-bold uppercase text-neutral-500 sm:inline">
                {(cat.items || []).length} items
              </span>
              <button
                type="button"
                onClick={() => removeCategory(cidx)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
                title="Delete section"
                aria-label="Delete section"
              >
                <Icon icon="solar:trash-bin-trash-outline" className="text-base" aria-hidden />
              </button>
            </div>

            <div className="space-y-0">
              <ItemDropIndicator cidx={cidx} slotIndex={0} />
              {(cat.items || []).map((item, iidx) => (
                <Fragment key={iidx}>
                  <div
                    data-item-row=""
                    className={`rounded-xl border bg-brand-e/10 px-2 py-2 transition sm:px-3 ${dragItem?.cidx === cidx && dragItem?.iidx === iidx
                      ? "border-emerald-400/50 opacity-45 shadow-inner"
                      : itemDropSlot?.cidx === cidx && (itemDropSlot?.slot === iidx || itemDropSlot?.slot === iidx + 1)
                        ? "border-emerald-200"
                        : "border-neutral-100"
                      }`}
                    onDragOver={(e) => {
                      if (!dragItem) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      const slot = itemSlotFromClientY(cidx, iidx, e.clientY, e.currentTarget);
                      setItemDropSlot({ cidx, slot });
                    }}
                    onDrop={(e) => {
                      if (!dragItem) return;
                      e.preventDefault();
                      e.stopPropagation();
                      const slot = itemSlotFromClientY(cidx, iidx, e.clientY, e.currentTarget);
                      onItemDropAtSlot(cidx, slot);
                    }}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                      <div className="flex w-full sm:w-auto shrink-0 items-center gap-1 self-start sm:flex-col sm:pt-0.5">
                        <span
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", `item-${cidx}-${iidx}`);
                            setDragItem({ cidx, iidx });
                          }}
                          onDragEnd={endItemDrag}
                          className="inline-flex h-9 w-9 cursor-grab touch-none items-center justify-center rounded-lg bg-white text-neutral-600 shadow-sm active:cursor-grabbing"
                          title="Drag item"
                        >
                          <Icon icon="solar:hamburger-menu-outline" className="text-lg" aria-hidden />
                        </span>
                        <div className="flex gap-0.5 sm:flex-col">
                          <button
                            type="button"
                            onClick={() => moveItemUp(cidx, iidx)}
                            disabled={iidx === 0}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 disabled:opacity-30"
                            aria-label="Move item up"
                            title="Move up"
                          >
                            <Icon icon="solar:alt-arrow-up-linear" className="text-lg" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItemDown(cidx, iidx)}
                            disabled={iidx >= (cat.items || []).length - 1}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 disabled:opacity-30"
                            aria-label="Move item down"
                            title="Move down"
                          >
                            <Icon icon="solar:alt-arrow-down-linear" className="text-lg" aria-hidden />
                          </button>
                        </div>
                        <div className="ml-auto">
                          <button
                            type="button"
                            onClick={() => removeItem(cidx, iidx)}
                            className="inline-flex sm:hidden h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
                            title="Remove item"
                            aria-label="Remove item"
                          >
                            <Icon icon="solar:trash-bin-trash-outline" className="text-base" aria-hidden />
                          </button>
                        </div>
                      </div>

                      <div
                        className="min-w-0 flex-1 space-y-2"
                        onDragOver={(e) => {
                          if (!dragItem) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          const row = e.currentTarget.closest("[data-item-row]");
                          if (!row) return;
                          const slot = itemSlotFromClientY(cidx, iidx, e.clientY, row);
                          setItemDropSlot({ cidx, slot });
                        }}
                        onDrop={(e) => {
                          if (!dragItem) return;
                          e.preventDefault();
                          e.stopPropagation();
                          const row = e.currentTarget.closest("[data-item-row]");
                          if (!row) return;
                          onItemDropAtSlot(cidx, itemSlotFromClientY(cidx, iidx, e.clientY, row));
                        }}
                      >
                        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                          <div className="min-w-0 flex-1 basis-[min(100%,12rem)]">
                            <input
                              draggable={false}
                              value={item.name}
                              maxLength={MAX_DIGITAL_NAME_LENGTH}
                              onChange={(e) => updateItem(cidx, iidx, { name: e.target.value })}
                              placeholder="Item name"
                              className={`text-sm font-semibold text-neutral-900 ${lineInput}`}
                            />
                          </div>
                          <div className="flex shrink-0 items-end gap-2">
                            <div className="w-20 sm:w-24">
                              <input
                                draggable={false}
                                value={item.price}
                                maxLength={MAX_DIGITAL_PRICE_LENGTH}
                                onChange={(e) => updateItem(cidx, iidx, { price: e.target.value })}
                                placeholder="Price"
                                inputMode="decimal"
                                className={lineInputPrice}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(cidx, iidx)}
                              className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
                              title="Remove item"
                              aria-label="Remove item"
                            >
                              <Icon icon="solar:trash-bin-trash-outline" className="text-base" aria-hidden />
                            </button>
                          </div>
                        </div>
                        {showDescriptions ? (
                          <textarea
                            draggable={false}
                            value={item.description}
                            rows={descriptionRows}
                            maxLength={MAX_DIGITAL_DESCRIPTION_LENGTH}
                            onChange={(e) => updateItem(cidx, iidx, { description: e.target.value })}
                            placeholder="Short description (optional)"
                            className={lineTextarea}
                            spellCheck={true}
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <ItemDropIndicator cidx={cidx} slotIndex={iidx + 1} />
                </Fragment>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addItem(cidx)}
              disabled={(cat.items || []).length >= MAX_DIGITAL_ITEMS_PER_CATEGORY}
              className="w-full rounded-lg border border-dashed border-brand-e bg-brand-e/15 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Add item {String(cat.name || "").trim() ? `to ${String(cat.name).trim()}` : ""}
            </button>
          </div>
          <CategoryDropIndicator slotIndex={cidx + 1} />
        </Fragment>
      ))}

      <button
        type="button"
        onClick={addCategory}
        disabled={model.categories.length >= MAX_DIGITAL_CATEGORIES}
        className="w-full rounded-xl border border-dashed border-brand-patri bg-brand-patri/15 px-2 py-3 text-sm text-neutral-600 uppercase font-semibold disabled:cursor-not-allowed disabled:opacity-40 mb-5"
      >
        + Add category
      </button>
    </div>
  );
}
