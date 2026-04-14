import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../auth/auth.store";
import apiClient from "../../shared/services/apiClient";

const OpensByDayChart = lazy(() => import("./OpensByDayChart"));

/** Local calendar date YYYY-MM-DD (not UTC — avoids “today” shifting by timezone). */
function toLocalYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysLocal(ymd, deltaDays) {
  const [y, m, da] = ymd.split("-").map(Number);
  const d = new Date(y, m - 1, da);
  d.setDate(d.getDate() + deltaDays);
  return toLocalYMD(d);
}

function StatCard({ title, children }) {
  return (
    <div className="rounded border border-[#dbdbdb] bg-white p-4">
      <h3 className="mb-3 border-b border-[#efefef] pb-2 text-xs font-semibold uppercase tracking-wide text-[#8e8e8e]">
        {title}
      </h3>
      {children}
    </div>
  );
}

const todayLocal = () => toLocalYMD(new Date());

function formatChartDayLabel(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function humanizeDeviceType(raw) {
  const s = (raw || "unknown").toLowerCase();
  if (s === "mobile") return "Mobile";
  if (s === "tablet") return "Tablet";
  if (s === "desktop") return "Desktop";
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Unknown";
}

export default function AnalyticsDashboard() {
  const user = useAuthStore((s) => s.user);
  const showAdvancedInsights =
    import.meta.env.DEV === true || String(user?.role || "").toLowerCase() === "master_admin";
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState(() => {
    const end = todayLocal();
    return { start: addDaysLocal(end, -29), end };
  });
  const [viewMode, setViewMode] = useState("summary");

  const activePreset = useMemo(() => {
    const t = todayLocal();
    const { start, end } = dateRange;
    if (start === end && end === t) return "today";
    if (end === t && start === addDaysLocal(t, -6)) return "7d";
    if (end === t && start === addDaysLocal(t, -29)) return "30d";
    const monthStart = `${t.slice(0, 7)}-01`;
    if (end === t && start === monthStart) return "month";
    return "custom";
  }, [dateRange]);

  const opensByDayPoints = useMemo(() => {
    if (viewMode !== "summary" || !analytics?.daily_views) return [];
    return Object.entries(analytics.daily_views)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, views]) => ({
        date,
        label: formatChartDayLabel(date),
        views,
      }));
  }, [viewMode, analytics]);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, viewMode, user?.shop_username]);

  const fetchAnalytics = async () => {
    if (!user?.shop_username) {
      setLoading(false);
      setError("Open your profile after sign-in, or sign in again.");
      return;
    }
    try {
      setLoading(true);
      setError(null);

      if (viewMode === "summary") {
        const response = await apiClient.get(
          `/analytics/shop/${user.shop_username}/summary?start_date=${dateRange.start}&end_date=${dateRange.end}`
        );
        setAnalytics(response.data.data);
      } else {
        const response = await apiClient.get(
          `/analytics/shop/${user.shop_username}/details?limit=50&offset=0`
        );
        setAnalytics(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError(err.response?.data?.message || err.message || "Couldn’t load insights");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[#8e8e8e]">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-[#ffccc7] bg-[#fff2f0] px-4 py-3 text-center text-sm text-[#cf1322]">
        {error}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center text-sm text-[#8e8e8e]">No data yet — share your menu link first.</div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-4">
      <div>
        <h2 className="text-lg font-semibold text-[#262626]">Insights</h2>
        <p className="mt-1 text-sm text-[#737373]">
          Who opened your menu. Mobile and tablet visits show <strong className="font-semibold">device brand</strong>
          ; desktop visits show <strong className="font-semibold">system</strong>.
          {showAdvancedInsights ? (
            <>
              {" "}
              Referrers and country appear below for debugging and growth experiments.
            </>
          ) : null}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
          className="rounded-full border border-[#dbdbdb] bg-white px-4 py-2 text-sm font-medium text-[#262626] shadow-sm"
        >
          <option value="summary">Overview</option>
          <option value="detail">Recent visits</option>
        </select>
      </div>

      {viewMode === "summary" && (
        <div className="rounded-xl border border-[#dbdbdb] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8e8e8e]">Date range</p>
              <p className="text-sm text-[#737373]">
                The last day you pick is included in full — same-day visits are no longer cut off.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { id: "today", label: "Today", apply: () => {
                  const t = todayLocal();
                  setDateRange({ start: t, end: t });
                } },
              { id: "7d", label: "Last 7 days", apply: () => {
                  const t = todayLocal();
                  setDateRange({ start: addDaysLocal(t, -6), end: t });
                } },
              { id: "30d", label: "Last 30 days", apply: () => {
                  const t = todayLocal();
                  setDateRange({ start: addDaysLocal(t, -29), end: t });
                } },
              { id: "month", label: "This month", apply: () => {
                  const t = todayLocal();
                  setDateRange({ start: `${t.slice(0, 7)}-01`, end: t });
                } },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={p.apply}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  activePreset === p.id
                    ? "bg-[var(--brand-e)] text-white"
                    : "bg-[#efefef] text-[#262626] hover:bg-[#e0e0e0]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-4 border-t border-[#efefef] pt-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="range-start" className="mb-1.5 block text-xs font-semibold text-[#8e8e8e]">
                From
              </label>
              <input
                id="range-start"
                type="date"
                value={dateRange.start}
                max={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full rounded-lg border border-[#dbdbdb] bg-[#fafafa] px-3 py-2.5 text-sm text-[#262626] focus:border-[#a8a8a8] focus:bg-white focus:outline-none"
              />
            </div>
            <span className="hidden pb-2 text-[#c7c7c7] sm:block" aria-hidden>
              —
            </span>
            <div className="flex-1">
              <label htmlFor="range-end" className="mb-1.5 block text-xs font-semibold text-[#8e8e8e]">
                To
              </label>
              <input
                id="range-end"
                type="date"
                value={dateRange.end}
                min={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full rounded-lg border border-[#dbdbdb] bg-[#fafafa] px-3 py-2.5 text-sm text-[#262626] focus:border-[#a8a8a8] focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {viewMode === "summary" && (
        <>
          <div className="rounded border border-[#dbdbdb] bg-white py-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8e8e8e]">Menu opens</p>
            <p className="mt-2 text-4xl font-light tabular-nums text-[#262626]">
              {analytics.total_views ?? 0}
            </p>
          </div>

          {opensByDayPoints.length > 0 && (
            <StatCard title="Opens by day">
              <Suspense
                fallback={<div className="h-[240px] animate-pulse rounded-md bg-[#f0f0f0] sm:h-[260px]" />}
              >
                <OpensByDayChart points={opensByDayPoints} />
              </Suspense>
              <p className="mt-1 text-[11px] text-[#a8a8a8]">Hover a bar for the exact date and count.</p>
            </StatCard>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard title="Device type">
              <ul className="space-y-2 text-sm">
                {Object.entries(analytics.device_breakdown || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v]) => (
                    <li key={k} className="flex justify-between text-[#262626]">
                      <span className="text-[#737373]">{humanizeDeviceType(k)}</span>
                      <span className="font-semibold tabular-nums">{v}</span>
                    </li>
                  ))}
              </ul>
            </StatCard>
            <StatCard title="Browser">
              <ul className="space-y-2 text-sm">
                {Object.entries(analytics.browser_breakdown || {}).map(([k, v]) => (
                  <li key={k} className="flex justify-between text-[#262626]">
                    <span className="text-[#737373]">{k}</span>
                    <span className="font-semibold tabular-nums">{v}</span>
                  </li>
                ))}
              </ul>
            </StatCard>
            <StatCard title="Mobile & tablet brands">
              <ul className="space-y-2 text-sm">
                {Object.keys(analytics.mobile_brand_breakdown || {}).length === 0 ? (
                  <li className="text-[#8e8e8e]">No mobile or tablet visits in this range.</li>
                ) : (
                  Object.entries(analytics.mobile_brand_breakdown).map(([k, v]) => (
                    <li key={k} className="flex justify-between text-[#262626]">
                      <span className="text-[#737373]">{k}</span>
                      <span className="font-semibold tabular-nums">{v}</span>
                    </li>
                  ))
                )}
              </ul>
            </StatCard>
            <StatCard title="Desktop system">
              <ul className="space-y-2 text-sm">
                {Object.keys(analytics.desktop_os_breakdown || {}).length === 0 ? (
                  <li className="text-[#8e8e8e]">No desktop visits in this range.</li>
                ) : (
                  Object.entries(analytics.desktop_os_breakdown).map(([k, v]) => (
                    <li key={k} className="flex justify-between text-[#262626]">
                      <span className="text-[#737373]">{k}</span>
                      <span className="font-semibold tabular-nums">{v}</span>
                    </li>
                  ))
                )}
              </ul>
            </StatCard>
            {showAdvancedInsights ? (
              <>
                <StatCard title="Opened from (referrer)">
                  <p className="mb-2 text-xs text-[#8e8e8e]">
                    Dev / admin only. Link-in-bio tools sometimes send a referrer — direct menu links look like
                    &quot;direct&quot; or empty.
                  </p>
                  <ul className="space-y-2 text-sm">
                    {Object.keys(analytics.top_referrers || {}).length === 0 ? (
                      <li className="text-[#8e8e8e]">No referrer data (direct visits or privacy).</li>
                    ) : (
                      Object.entries(analytics.top_referrers).map(([k, v]) => (
                        <li key={k} className="flex justify-between gap-2 text-[#262626]">
                          <span className="min-w-0 truncate text-[#737373]" title={k}>
                            {k || "direct / unknown"}
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums">{v}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </StatCard>
                <StatCard title="Places (country)">
                  <p className="mb-2 text-xs text-[#8e8e8e]">Dev / admin only — from client-reported location when available.</p>
                  <ul className="space-y-2 text-sm">
                    {Object.entries(analytics.country_breakdown || {})
                      .slice(0, 8)
                      .map(([k, v]) => (
                        <li key={k} className="flex justify-between text-[#262626]">
                          <span className="text-[#737373]">{k || "—"}</span>
                          <span className="font-semibold tabular-nums">{v}</span>
                        </li>
                      ))}
                  </ul>
                </StatCard>
              </>
            ) : null}
          </div>
        </>
      )}

      {viewMode === "detail" && Array.isArray(analytics) && (
        <div className="overflow-x-auto rounded border border-[#dbdbdb] bg-white">
          <table
            className={`w-full text-left text-xs ${showAdvancedInsights ? "min-w-[720px]" : "min-w-[480px]"}`}
          >
            <thead>
              <tr className="border-b border-[#efefef] text-[#8e8e8e]">
                <th className="px-3 py-2 font-semibold">When</th>
                <th className="px-3 py-2 font-semibold">Device type</th>
                <th className="px-3 py-2 font-semibold">Brand / system</th>
                <th className="px-3 py-2 font-semibold">Browser</th>
                {showAdvancedInsights ? (
                  <>
                    <th className="px-3 py-2 font-semibold">Opened from</th>
                    <th className="px-3 py-2 font-semibold">Place</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {analytics.map((record, idx) => {
                const dt = record.device_type || "";
                const isHandheld = dt === "mobile" || dt === "tablet";
                const brandOrSystem = isHandheld
                  ? record.device_brand || "—"
                  : record.os || "—";
                return (
                  <tr key={idx} className="border-b border-[#fafafa] text-[#262626]">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {new Date(record.tracked_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">{humanizeDeviceType(dt)}</td>
                    <td className="px-3 py-2">
                      <span className="font-medium">{brandOrSystem}</span>
                      {isHandheld && record.os && record.os !== "unknown" ? (
                        <span className="block text-[#8e8e8e]">{record.os}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{record.browser || "—"}</td>
                    {showAdvancedInsights ? (
                      <>
                        <td className="max-w-[200px] truncate px-3 py-2 text-[#737373]" title={record.referrer || ""}>
                          {record.referrer || "—"}
                        </td>
                        <td className="px-3 py-2">{record.country || "—"}</td>
                      </>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
