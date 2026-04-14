import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Matches admin `--brand-e` for SVG fills (Recharts does not read CSS vars reliably everywhere). */
const BRAND_E = "#1e9459";

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

  return (
    <div className="h-[240px] w-full min-w-0 sm:h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={points}
          margin={{ top: 6, right: 8, left: 4, bottom: manyDays ? 8 : 4 }}
          barCategoryGap="12%"
        >
          <CartesianGrid stroke="#efefef" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#737373" }}
            tickLine={false}
            axisLine={{ stroke: "#dbdbdb" }}
            minTickGap={10}
            angle={manyDays ? -30 : 0}
            textAnchor={manyDays ? "end" : "middle"}
            height={manyDays ? 48 : 28}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#8e8e8e" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={36}
          />
          <Tooltip content={<OpensTooltip />} cursor={{ fill: "rgba(30, 148, 89, 0.06)" }} />
          <Bar dataKey="views" name="Opens" fill={BRAND_E} radius={[5, 5, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
