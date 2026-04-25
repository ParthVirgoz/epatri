import { useEffect, useState } from "react";
import { getMenuSchedulesApi, putMenuSchedulesApi } from "../pages/menu.api";
import { toast } from "sonner";
import { MAX_SCHEDULE_RULES_PER_MENU_GROUP } from "../menuConstants.js";

const TYPE_OPTIONS = [
  { value: "always", label: "Every day" },
  { value: "weekly", label: "Specific weekdays" },
  { value: "date_range", label: "Between two dates" },
  { value: "single_date", label: "One calendar date" },
];

const DAY_OPTIONS = [
  { v: 0, l: "Sun" },
  { v: 1, l: "Mon" },
  { v: 2, l: "Tue" },
  { v: 3, l: "Wed" },
  { v: 4, l: "Thu" },
  { v: 5, l: "Fri" },
  { v: 6, l: "Sat" },
];

function normalizeRule(r) {
  return {
    schedule_type: r?.schedule_type || "always",
    priority: Number(r?.priority || 0),
    is_active: r?.is_active !== false,
    days_of_week: Array.isArray(r?.days_of_week) ? r.days_of_week.map(Number) : [],
    valid_from: r?.valid_from || "",
    valid_to: r?.valid_to || "",
    single_date: r?.single_date || "",
  };
}

/** Clears fields that do not apply when the rule type changes (keeps priority / active). */
function ruleAfterTypeChange(prev, schedule_type) {
  const base = { ...prev, schedule_type };
  if (schedule_type === "always") {
    return normalizeRule({ ...base, days_of_week: [], valid_from: "", valid_to: "", single_date: "" });
  }
  if (schedule_type === "weekly") {
    return normalizeRule({ ...base, valid_from: "", valid_to: "", single_date: "" });
  }
  if (schedule_type === "date_range") {
    return normalizeRule({ ...base, days_of_week: [], single_date: "" });
  }
  if (schedule_type === "single_date") {
    return normalizeRule({ ...base, days_of_week: [], valid_from: "", valid_to: "" });
  }
  return normalizeRule(base);
}

function validateRules(rules) {
  if (rules.length > MAX_SCHEDULE_RULES_PER_MENU_GROUP) {
    return `At most ${MAX_SCHEDULE_RULES_PER_MENU_GROUP} rules per menu. Remove some rules or merge timing.`;
  }
  for (let i = 0; i < rules.length; i += 1) {
    const r = rules[i];
    if (r.is_active === false) continue;
    const n = i + 1;
    if (r.schedule_type === "weekly") {
      if (!r.days_of_week?.length) {
        return `Rule ${n}: choose at least one weekday, or turn the rule off.`;
      }
    }
    if (r.schedule_type === "date_range") {
      if (!r.valid_from || !r.valid_to) {
        return `Rule ${n}: add both a start date and an end date.`;
      }
      if (r.valid_from > r.valid_to) {
        return `Rule ${n}: end date must be on or after the start date.`;
      }
    }
    if (r.schedule_type === "single_date" && !r.single_date) {
      return `Rule ${n}: pick the date when this menu should run.`;
    }
  }
  return null;
}

export default function MenuSchedulesPanel({ menuId, menuTitle, menuStatus, embedded }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!menuId) {
      setRules([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setMsg(null);
      const [data, err] = await getMenuSchedulesApi(menuId);
      if (cancelled) return;
      setLoading(false);
      if (err) {
        setMsg({ type: "err", text: err });
        toast.error(err);
        return;
      }
      const rows = (data?.schedules || []).map(normalizeRule);
      setRules(rows.length ? rows : [normalizeRule({ schedule_type: "always", priority: 0 })]);
    })();
    return () => {
      cancelled = true;
    };
  }, [menuId]);

  const updateRule = (idx, patch) => {
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const toggleDay = (idx, day) => {
    const r = rules[idx];
    const has = r.days_of_week.includes(day);
    const next = has ? r.days_of_week.filter((d) => d !== day) : [...r.days_of_week, day].sort((a, b) => a - b);
    updateRule(idx, { days_of_week: next });
  };

  const addRule = () => setRules((prev) => [...prev, normalizeRule({ schedule_type: "weekly", priority: 1 })]);
  const removeRule = (idx) => setRules((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    const validationError = validateRules(rules);
    if (validationError) {
      toast.error(validationError);
      setMsg({ type: "err", text: validationError });
      return;
    }

    const payload = rules.map((r) => ({
      schedule_type: r.schedule_type,
      priority: Number(r.priority) || 0,
      is_active: r.is_active !== false,
      days_of_week: r.schedule_type === "weekly" ? r.days_of_week : null,
      valid_from: r.schedule_type === "date_range" ? (r.valid_from || null) : null,
      valid_to: r.schedule_type === "date_range" ? (r.valid_to || null) : null,
      single_date: r.schedule_type === "single_date" ? (r.single_date || null) : null,
    }));

    setSaving(true);
    setMsg(null);
    const [, err] = await putMenuSchedulesApi(menuId, payload);
    setSaving(false);
    if (err) {
      setMsg({ type: "err", text: err });
      toast.error(err);
      return;
    }
    setMsg({ type: "ok", text: "Timing saved. Guests will see this menu whenever a rule here matches." });
    toast.success("Menu timing saved");
  };

  if (!menuId) return null;

  return (
    <div
      className={
        embedded
          ? "space-y-4"
          : "space-y-4 rounded-xl border border-[#dbdbdb] bg-white p-4 shadow-sm"
      }
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#262626]">Schedule</p>
            <p className="mt-1 text-xs leading-relaxed text-[#525252]">
              Rules apply to this menu group (all versions share the same schedule). If several menus at this outlet overlap,
              the higher <span className="font-semibold">priority</span> wins. For this menu, guests see the best matching
              published version, or the default. Up to <span className="font-semibold">{MAX_SCHEDULE_RULES_PER_MENU_GROUP}</span>{" "}
              rules.
            </p>
          </div>
          <button
            type="button"
            onClick={addRule}
            disabled={rules.length >= MAX_SCHEDULE_RULES_PER_MENU_GROUP}
            title={
              rules.length >= MAX_SCHEDULE_RULES_PER_MENU_GROUP
                ? `Maximum ${MAX_SCHEDULE_RULES_PER_MENU_GROUP} rules`
                : undefined
            }
            className="shrink-0 rounded-lg border border-[#dbdbdb] bg-white px-3 py-2 text-xs font-semibold text-[#262626] hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add rule
          </button>
        </div>
        {menuStatus === "draft" ? (
          <p className="rounded-lg bg-[#f5f3ff] px-3 py-2 text-xs leading-relaxed text-[#5b21b6]">
            This version is still a draft. Publish it under <strong>Versions</strong> so it can appear on the public page.
          </p>
        ) : null}
      </div>

      {msg ? (
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            msg.type === "ok"
              ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#14532d]"
              : "border-[#ffccc7] bg-[#fff2f0] text-[#cf1322]"
          }`}
        >
          {msg.text}
        </div>
      ) : null}

      {loading ? <p className="text-xs text-[#737373]">Loading timing rules…</p> : null}

      {!loading &&
        rules.map((rule, idx) => (
          <div key={idx} className="space-y-3 rounded-xl border border-[#ececec] bg-[#fafafa] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-[#737373]">
                Rule {idx + 1}
                {menuTitle ? ` · ${menuTitle}` : ""}
              </p>
              {rules.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeRule(idx)}
                  className="text-xs font-semibold text-[#b42318] hover:underline"
                >
                  Remove rule
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#737373]">When it runs</span>
                <select
                  value={rule.schedule_type}
                  onChange={(e) => updateRule(idx, ruleAfterTypeChange(rule, e.target.value))}
                  className="rounded-lg border border-[#dbdbdb] bg-white px-3 py-2 text-sm text-[#262626]"
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#737373]">Priority</span>
                <input
                  type="number"
                  value={rule.priority}
                  onChange={(e) => updateRule(idx, { priority: Number(e.target.value) || 0 })}
                  className="rounded-lg border border-[#dbdbdb] bg-white px-3 py-2 text-sm"
                  min={0}
                />
                <span className="text-[11px] text-[#737373]">Higher = chosen first when rules overlap</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#dbdbdb] bg-white px-3 py-2 sm:col-span-2 lg:col-span-2">
                <input
                  type="checkbox"
                  checked={rule.is_active}
                  onChange={(e) => updateRule(idx, { is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-[#dbdbdb]"
                />
                <span className="text-sm text-[#262626]">Use this rule</span>
              </label>
            </div>

            {rule.schedule_type === "weekly" ? (
              <div>
                <p className="mb-2 text-xs font-semibold text-[#525252]">Active on these days</p>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_OPTIONS.map((d) => (
                    <button
                      key={d.v}
                      type="button"
                      onClick={() => toggleDay(idx, d.v)}
                      className={`min-w-10 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        rule.days_of_week.includes(d.v)
                          ? "border-(--brand-e) bg-(--brand-e) text-white"
                          : "border-[#dbdbdb] bg-white text-[#262626] hover:border-[#a3a3a3]"
                      }`}
                    >
                      {d.l}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {rule.schedule_type === "date_range" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-[#525252]">Start date</span>
                  <input
                    type="date"
                    value={rule.valid_from}
                    onChange={(e) => updateRule(idx, { valid_from: e.target.value })}
                    className="rounded-lg border border-[#dbdbdb] bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-[#525252]">End date</span>
                  <input
                    type="date"
                    value={rule.valid_to}
                    onChange={(e) => updateRule(idx, { valid_to: e.target.value })}
                    className="rounded-lg border border-[#dbdbdb] bg-white px-3 py-2 text-sm"
                  />
                </label>
              </div>
            ) : null}

            {rule.schedule_type === "single_date" ? (
              <label className="flex max-w-xs flex-col gap-1">
                <span className="text-xs font-semibold text-[#525252]">Date</span>
                <input
                  type="date"
                  value={rule.single_date}
                  onChange={(e) => updateRule(idx, { single_date: e.target.value })}
                  className="rounded-lg border border-[#dbdbdb] bg-white px-3 py-2 text-sm"
                />
              </label>
            ) : null}
          </div>
        ))}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl bg-[#262626] py-3 text-sm font-bold text-white hover:bg-black disabled:opacity-40"
      >
        {saving ? "Saving…" : "Save timing rules"}
      </button>
    </div>
  );
}
