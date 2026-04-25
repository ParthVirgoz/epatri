import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "../auth/auth.store";
import apiClient from "../../shared/services/apiClient";
import {
  eligibleMilestoneTotal,
  getMilestoneStorageKey,
  readCelebratedMaxMilestone,
  runMenuOpenMilestoneConfetti,
  writeCelebratedMaxMilestone,
} from "./insightCelebration";

const OpensByDayChart = lazy(() => import("./OpensByDayChart"));

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

function eachYmdInRange(startYmd, endYmd) {
  if (!startYmd || !endYmd || startYmd > endYmd) return [];
  const out = [];
  let cur = startYmd;
  let guard = 0;
  while (cur <= endYmd && guard < 400) {
    guard += 1;
    out.push(cur);
    if (cur === endYmd) break;
    cur = addDaysLocal(cur, 1);
  }
  return out;
}

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

function growthLabel(growth) {
  if (!growth) return "—";
  if (growth.percent_change == null) {
    if ((growth.previous_total ?? 0) === 0) return "0 baseline";
    return "No prior data";
  }
  const sign = growth.percent_change >= 0 ? "+" : "";
  return `${sign}${growth.percent_change.toFixed(1)}%`;
}

function MetricCard({ title, value, hint, tone = "neutral" }) {
  const toneClass =
    tone === "positive" ? "text-[#0f6b47]" : tone === "negative" ? "text-[#b42318]" : "text-[#262626]";
  return (
    <div className="rounded-xl border border-[#dbdbdb] bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#8e8e8e]">{title}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#8e8e8e]">{hint}</p> : null}
    </div>
  );
}

const todayLocal = () => toLocalYMD(new Date());

export default function AnalyticsDashboard() {
  const user = useAuthStore((s) => s.user);
  const showAdvancedInsights =
    import.meta.env.DEV === true || String(user?.role || "").toLowerCase() === "master_admin";

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("summary");
  const [showAdvancedDateFilter, setShowAdvancedDateFilter] = useState(false);
  const [dateRange, setDateRange] = useState(() => {
    const end = todayLocal();
    return { start: addDaysLocal(end, -29), end };
  });
  const [insightLocationId, setInsightLocationId] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [streamState, setStreamState] = useState("connecting");
  const [liveEventCount, setLiveEventCount] = useState(0);

  const streamAbortRef = useRef(null);
  const analyticsRef = useRef(null);
  analyticsRef.current = analytics;

  const accessibleLocations = useMemo(() => user?.accessible_locations || [], [user?.accessible_locations]);

  const activePreset = useMemo(() => {
    const t = todayLocal();
    const { start, end } = dateRange;
    if (start === end && end === t) return "today";
    if (end === t && start === addDaysLocal(t, -6)) return "7d";
    if (end === t && start === addDaysLocal(t, -29)) return "30d";
    if (end === t && start === `${t.slice(0, 7)}-01`) return "month";
    return "custom";
  }, [dateRange]);

  const isTodayOnly = activePreset === "today";

  const opensByDayPoints = useMemo(() => {
    if (viewMode !== "summary" || !analytics || Array.isArray(analytics)) return [];
    const daily = analytics.daily_views || {};
    return eachYmdInRange(dateRange.start, dateRange.end).map((date) => ({
      date,
      label: formatChartDayLabel(date),
      views: Number(daily[date]) || 0,
    }));
  }, [viewMode, analytics, dateRange]);

  const todayViews = useMemo(() => {
    if (!analytics || Array.isArray(analytics)) return 0;
    return Number(analytics.daily_views?.[todayLocal()]) || 0;
  }, [analytics]);

  const fetchAnalytics = useCallback(
    async ({ silent = false } = {}) => {
      if (!user?.shop_username) {
        if (!silent) setLoading(false);
        setError("Open your profile after sign-in, or sign in again.");
        return;
      }
      try {
        if (!silent) {
          const hasData = Boolean(analyticsRef.current);
          setLoading(!hasData);
          setRefreshing(hasData);
          setError(null);
        }
        const locQ =
          insightLocationId && accessibleLocations.length > 1
            ? `&location_id=${encodeURIComponent(insightLocationId)}`
            : "";
        const tzQ = `&tz_offset_min=${new Date().getTimezoneOffset()}`;
        if (viewMode === "summary") {
          const res = await apiClient.get(
            `/analytics/shop/${user.shop_username}/summary?start_date=${dateRange.start}&end_date=${dateRange.end}${tzQ}${locQ}`,
          );
          setAnalytics(res.data.data);
        } else {
          const res = await apiClient.get(
            `/analytics/shop/${user.shop_username}/details?limit=50&offset=0${locQ}`,
          );
          setAnalytics(res.data.data);
        }
        setLastSyncedAt(Date.now());
      } catch (err) {
        if (!silent) {
          setError(err.response?.data?.message || err.message || "Couldn’t load insights");
        }
      } finally {
        if (!silent) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [user?.shop_username, viewMode, dateRange.start, dateRange.end, insightLocationId, accessibleLocations.length],
  );

  useEffect(() => {
    if (accessibleLocations.length <= 1) {
      setInsightLocationId(accessibleLocations[0]?.id ?? null);
      return;
    }
    const saved = sessionStorage.getItem("epatri_insights_location_id");
    const pick = saved && accessibleLocations.some((l) => l.id === saved) ? saved : null;
    setInsightLocationId(pick);
  }, [accessibleLocations]);

  useEffect(() => {
    fetchAnalytics({ silent: false });
  }, [fetchAnalytics]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token || !user?.shop_username) {
      setStreamState("offline");
      return undefined;
    }
    if (streamAbortRef.current) streamAbortRef.current.abort();
    const ctrl = new AbortController();
    streamAbortRef.current = ctrl;

    let cancelled = false;
    setStreamState("connecting");
    let retryTimer = null;
    const connect = async () => {
      try {
        const base = String(apiClient.defaults.baseURL || "").replace(/\/+$/, "");
        const url = `${base}/analytics/shop/${encodeURIComponent(user.shop_username)}/stream`;
        const res = await fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) throw new Error(`Stream failed (${res.status})`);
        setStreamState("live");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          for (const raw of parts) {
            if (!raw.includes("event: analytics")) continue;
            const dataLine = raw.split("\n").find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            let payload = null;
            try {
              payload = JSON.parse(dataLine.slice(6));
            } catch {
              payload = null;
            }
            if (!payload) continue;
            if (payload.event_type && payload.event_type !== "view") continue;
            if (insightLocationId && payload.location_id !== insightLocationId) continue;

            setLiveEventCount((n) => n + 1);
            if (viewMode === "summary") {
              const localDay = payload.tracked_at
                ? toLocalYMD(new Date(payload.tracked_at))
                : todayLocal();
              setAnalytics((prev) => {
                if (!prev || Array.isArray(prev)) return prev;
                const nextDaily = { ...(prev.daily_views || {}) };
                nextDaily[localDay] = (Number(nextDaily[localDay]) || 0) + 1;
                const nextDevice = { ...(prev.device_breakdown || {}) };
                const device = payload.device_type || "unknown";
                nextDevice[device] = (Number(nextDevice[device]) || 0) + 1;
                const nextGrowth = prev.growth ? { ...prev.growth } : null;
                if (nextGrowth) {
                  nextGrowth.current_total = (Number(nextGrowth.current_total) || 0) + 1;
                  const p = Number(nextGrowth.previous_total) || 0;
                  nextGrowth.percent_change = p > 0 ? ((nextGrowth.current_total - p) / p) * 100 : null;
                }
                return {
                  ...prev,
                  total_views: (Number(prev.total_views) || 0) + 1,
                  daily_views: nextDaily,
                  device_breakdown: nextDevice,
                  growth: nextGrowth,
                };
              });
            }
            setLastSyncedAt(Date.now());
          }
        }
        if (!cancelled) setStreamState("offline");
      } catch {
        if (!cancelled) {
          setStreamState("offline");
          retryTimer = setTimeout(() => {
            if (!cancelled) {
              setStreamState("connecting");
              connect();
            }
          }, 3000);
        }
      }
    };
    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      ctrl.abort();
    };
  }, [user?.shop_username, insightLocationId, viewMode, fetchAnalytics]);

  // Production-safe fallback: keep dashboard fresh even when SSE cannot deliver
  // across serverless instances. This preserves "near real-time" behavior in live.
  useEffect(() => {
    if (!user?.shop_username) return undefined;
    const id = setInterval(() => {
      fetchAnalytics({ silent: true });
    }, 15000);
    return () => clearInterval(id);
  }, [user?.shop_username, fetchAnalytics]);

  useEffect(() => {
    if (loading || error) return;
    if (!user?.shop_username || viewMode !== "summary") return;
    if (!analytics || Array.isArray(analytics)) return;
    const total = Number(analytics.total_views || 0);
    const eligible = eligibleMilestoneTotal(total);
    const key = getMilestoneStorageKey(user.shop_username, insightLocationId, activePreset, dateRange);
    const celebrated = readCelebratedMaxMilestone(key);
    if (eligible > celebrated) {
      writeCelebratedMaxMilestone(key, eligible);
      runMenuOpenMilestoneConfetti();
      toast.success(`You reached ${eligible.toLocaleString()} opens`, {
        description: "Live milestone reached in this selected date range.",
      });
    }
  }, [loading, error, analytics, user?.shop_username, viewMode, insightLocationId, activePreset, dateRange]);

  if (loading && !analytics) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-[#8e8e8e]">Loading…</div>;
  }
  if (error && !analytics) {
    return <div className="rounded border border-[#ffccc7] bg-[#fff2f0] px-4 py-3 text-sm text-[#cf1322]">{error}</div>;
  }
  if (!analytics) {
    return <div className="text-sm text-[#8e8e8e]">No data yet — share your menu link first.</div>;
  }

  const growth = analytics?.growth;
  const growthTone = growth?.percent_change == null ? "neutral" : growth.percent_change >= 0 ? "positive" : "negative";
  const growthHint = growth?.period_days === 1 ? "vs yesterday" : `vs prior ${growth?.period_days || 0} days`;

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-6">
      <div className="rounded-xl border border-[#dbdbdb] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-[#262626]">Insights</h2>
          <span className="rounded-full border border-[#e8e8e8] bg-white px-2 py-0.5 text-[11px] font-medium text-[#6a6a6a]">
            {streamState === "live" ? "Live stream on" : streamState === "connecting" ? "Connecting…" : "Stream offline"}
          </span>
          {refreshing ? (
            <span className="rounded-full border border-[#dbdbdb] bg-white px-2 py-0.5 text-[11px] text-[#737373]">Updating…</span>
          ) : null}
          <span className="rounded-full border border-emerald-200/90 bg-emerald-50/80 px-2 py-0.5 text-[11px] font-semibold text-[#0f6b47]">
            Live events: {liveEventCount}
          </span>
          {lastSyncedAt ? (
            <span className="text-xs text-[#8e8e8e]">
              Last synced {new Date(lastSyncedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-[#737373]">
          Menu opens stream in without refresh. Designed for real-time monitoring.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {accessibleLocations.length > 1 ? (
          <select
            value={insightLocationId || ""}
            onChange={(e) => {
              const v = e.target.value || null;
              setInsightLocationId(v);
              if (v) sessionStorage.setItem("epatri_insights_location_id", v);
              else sessionStorage.removeItem("epatri_insights_location_id");
            }}
            className="rounded-full border border-[#dbdbdb] bg-white px-4 py-2 text-sm font-medium text-[#262626] shadow-sm"
          >
            <option value="">All outlets</option>
            {accessibleLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        ) : null}
        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
          className="rounded-full border border-[#dbdbdb] bg-white px-4 py-2 text-sm font-medium text-[#262626] shadow-sm"
        >
          <option value="summary">Overview</option>
          <option value="detail">Recent visits</option>
        </select>
      </div>

      {viewMode === "summary" ? (
        <>
          <div className="rounded-xl border border-[#dbdbdb] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8e8e8e]">Date range</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { id: "today", label: "Today", apply: () => { const t = todayLocal(); setDateRange({ start: t, end: t }); } },
                { id: "7d", label: "Last 7 days", apply: () => { const t = todayLocal(); setDateRange({ start: addDaysLocal(t, -6), end: t }); } },
                { id: "30d", label: "Last 30 days", apply: () => { const t = todayLocal(); setDateRange({ start: addDaysLocal(t, -29), end: t }); } },
                { id: "month", label: "This month", apply: () => { const t = todayLocal(); setDateRange({ start: `${t.slice(0, 7)}-01`, end: t }); } },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={p.apply}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${activePreset === p.id ? "bg-[var(--brand-e)] text-white" : "bg-[#efefef] text-[#262626]"}`}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowAdvancedDateFilter((v) => !v)}
                className="rounded-full border border-[#dbdbdb] bg-white px-4 py-2 text-sm font-semibold text-[#262626]"
              >
                {showAdvancedDateFilter ? "Hide full filter" : "Open full filter"}
              </button>
            </div>
            {showAdvancedDateFilter ? (
              <div className="mt-4 flex flex-col gap-3 border-t border-[#efefef] pt-4 sm:flex-row">
                <input
                  type="date"
                  value={dateRange.start}
                  max={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full rounded-lg border border-[#dbdbdb] bg-[#fafafa] px-3 py-2.5 text-sm"
                />
                <input
                  type="date"
                  value={dateRange.end}
                  min={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full rounded-lg border border-[#dbdbdb] bg-[#fafafa] px-3 py-2.5 text-sm"
                />
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard title="Menu opens" value={(analytics.total_views ?? 0).toLocaleString()} />
            <MetricCard title="Today opens" value={todayViews.toLocaleString()} />
            <MetricCard title="Growth rate" value={growthLabel(growth)} hint={growthHint} tone={growthTone} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#dbdbdb] bg-white shadow-sm">
            <div className="border-b border-[#efefef] px-4 py-3 text-xs text-[#737373]">
              {isTodayOnly ? "Today view focuses on live KPI cards." : "Day-by-day opens for selected range."}
            </div>
            {!isTodayOnly ? (
              <div className="bg-[#fafafa]/80 px-2 pb-3 pt-2 sm:px-3">
                <Suspense fallback={<div className="h-[200px] animate-pulse rounded-md bg-[#ececec] sm:h-[220px]" />}>
                  <OpensByDayChart points={opensByDayPoints} />
                </Suspense>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard
              title="Device categories"
              value={String(Object.keys(analytics.device_breakdown || {}).length)}
              hint="How many device types opened your menu"
            />
            <MetricCard
              title="Top browser"
              value={
                Object.entries(analytics.browser_breakdown || {}).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] ||
                "—"
              }
            />
          </div>
        </>
      ) : (
        <div className="overflow-x-auto rounded border border-[#dbdbdb] bg-white">
          <table className={`w-full text-left text-xs ${showAdvancedInsights ? "min-w-[720px]" : "min-w-[520px]"}`}>
            <thead>
              <tr className="border-b border-[#efefef] text-[#8e8e8e]">
                <th className="px-3 py-2 font-semibold">When</th>
                <th className="px-3 py-2 font-semibold">Device type</th>
                <th className="px-3 py-2 font-semibold">Brand / system</th>
                <th className="px-3 py-2 font-semibold">Browser</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(analytics)
                ? analytics.map((record, idx) => {
                    const dt = record.device_type || "";
                    const handheld = dt === "mobile" || dt === "tablet";
                    const brandOrSystem = handheld ? record.device_brand || "—" : record.os || "—";
                    return (
                      <tr key={idx} className="border-b border-[#fafafa] text-[#262626]">
                        <td className="px-3 py-2 whitespace-nowrap">{new Date(record.tracked_at).toLocaleString()}</td>
                        <td className="px-3 py-2">{humanizeDeviceType(dt)}</td>
                        <td className="px-3 py-2">{brandOrSystem}</td>
                        <td className="px-3 py-2">{record.browser || "—"}</td>
                      </tr>
                    );
                  })
                : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
