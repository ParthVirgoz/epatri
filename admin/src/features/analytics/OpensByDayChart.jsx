import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Matches admin `--brand-e` for SVG fills (Recharts does not read CSS vars reliably everywhere). */
const BRAND_E = "#1e9459";
const BRAND_E_SOFT = "#e8f5ef";

function lerpChannel(a, b, t) {
  return Math.round(a + (b - a) * t);
}

/** Stronger fill for busier days (0 → pale mint, max → brand green). */
function fillForBar(views, maxViews) {
  if (maxViews <= 0) return "#ececec";
  const t = Math.min(1, views / maxViews);
  const r1 = parseInt(BRAND_E_SOFT.slice(1, 3), 16);
  const g1 = parseInt(BRAND_E_SOFT.slice(3, 5), 16);
  const b1 = parseInt(BRAND_E_SOFT.slice(5, 7), 16);
  const r2 = parseInt(BRAND_E.slice(1, 3), 16);
  const g2 = parseInt(BRAND_E.slice(3, 5), 16);
  const b2 = parseInt(BRAND_E.slice(5, 7), 16);
  const r = lerpChannel(r1, r2, t);
  const g = lerpChannel(g1, g2, t);
  const bl = lerpChannel(b1, b2, t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

function OpensTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#dbdbdb] bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-[#262626]">{row.date}</p>
      <p className="mt-0.5 tabular-nums text-[#737373]">
        <span className="font-semibold text-[#262626]">{row.views}</span> opens
      </p>
    </div>
  );
}

/**
 * Daily opens bar chart — Recharts for stable layout, tooltips, and future charts (line, area, etc.).
 * @param {{ points: { date: string; label: string; views: number }[] }} props
 */
export default function OpensByDayChart({ points }) {
  if (!points.length) return null;

  const manyDays = points.length > 14;
  const maxViews = Math.max(0, ...points.map((p) => p.views));

  return (
    <div className="h-[200px] w-full min-w-0 sm:h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={points}
          margin={{ top: 6, right: 4, left: 0, bottom: manyDays ? 8 : 4 }}
          barCategoryGap={manyDays ? "8%" : "18%"}
        >
          <CartesianGrid stroke="#f0f0f0" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#737373" }}
            tickLine={false}
            axisLine={{ stroke: "#dbdbdb" }}
            minTickGap={8}
            interval="preserveStartEnd"
            angle={manyDays ? -35 : 0}
            textAnchor={manyDays ? "end" : "middle"}
            height={manyDays ? 52 : 28}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#8e8e8e" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={32}
          />
          <Tooltip content={<OpensTooltip />} cursor={{ fill: "rgba(30, 148, 89, 0.06)" }} />
          <Bar dataKey="views" name="Opens" radius={[6, 6, 0, 0]} maxBarSize={manyDays ? 28 : 44}>
            {points.map((entry, index) => (
              <Cell key={`cell-${entry.date}-${index}`} fill={fillForBar(entry.views, maxViews)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
