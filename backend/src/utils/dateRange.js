/**
 * Calendar YYYY-MM-DD → UTC bounds for timestamptz filters.
 * Postgres/Supabase treats `lte(tracked_at, '2026-04-13')` as start-of-day,
 * so events later that day were excluded. We use [start, nextDay) in UTC.
 */

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateRangeToUtcBounds(startDateStr, endDateStr) {
  let startIso = null;
  /** Exclusive upper bound: first instant AFTER the selected end date (UTC). */
  let endExclusiveIso = null;

  if (startDateStr && YMD.test(String(startDateStr).trim())) {
    startIso = `${String(startDateStr).trim()}T00:00:00.000Z`;
  }

  if (endDateStr && YMD.test(String(endDateStr).trim())) {
    const end = String(endDateStr).trim();
    const d = new Date(`${end}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) {
      d.setUTCDate(d.getUTCDate() + 1);
      endExclusiveIso = d.toISOString();
    }
  }

  return { startIso, endExclusiveIso };
}
