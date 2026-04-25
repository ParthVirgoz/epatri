/**
 * Calendar YYYY-MM-DD → UTC bounds for timestamptz filters.
 * Postgres/Supabase treats `lte(tracked_at, '2026-04-13')` as start-of-day,
 * so events later that day were excluded. We use [start, nextDay) in UTC.
 */

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function isYmd(dateStr) {
  return Boolean(dateStr && YMD.test(String(dateStr).trim()));
}

/**
 * Add calendar days to YYYY-MM-DD using UTC date math (aligned with {@link parseDateRangeToUtcBounds}).
 * @param {string} ymd
 * @param {number} deltaDays
 * @returns {string}
 */
export function ymdAddDays(ymd, deltaDays) {
  const t = String(ymd).trim();
  const [y, m, d] = t.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

/**
 * Every calendar day from start through end (inclusive), in order.
 * @param {string} startYmd
 * @param {string} endYmd
 * @returns {string[]}
 */
export function listYmdInclusive(startYmd, endYmd) {
  if (!isYmd(startYmd) || !isYmd(endYmd)) return [];
  let cur = String(startYmd).trim();
  const end = String(endYmd).trim();
  if (cur > end) return [];
  const out = [];
  let guard = 0;
  while (cur <= end && guard < 400) {
    guard += 1;
    out.push(cur);
    if (cur === end) break;
    cur = ymdAddDays(cur, 1);
  }
  return out;
}

/**
 * Convert local calendar date range to UTC bounds.
 * @param {string} startDateStr YYYY-MM-DD
 * @param {string} endDateStr YYYY-MM-DD
 * @param {number} tzOffsetMin minutes from `Date#getTimezoneOffset()` (UTC - local)
 */
export function parseDateRangeToUtcBounds(startDateStr, endDateStr, tzOffsetMin = 0) {
  let startIso = null;
  /** Exclusive upper bound: first instant AFTER the selected end date (UTC). */
  let endExclusiveIso = null;
  const offset = Number.isFinite(Number(tzOffsetMin)) ? Number(tzOffsetMin) : 0;

  if (startDateStr && YMD.test(String(startDateStr).trim())) {
    const [y, m, d] = String(startDateStr).trim().split('-').map(Number);
    const startUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0, 0) + offset * 60_000;
    startIso = new Date(startUtcMs).toISOString();
  }

  if (endDateStr && YMD.test(String(endDateStr).trim())) {
    const [y, m, d] = String(endDateStr).trim().split('-').map(Number);
    const endExclusiveUtcMs = Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0) + offset * 60_000;
    endExclusiveIso = new Date(endExclusiveUtcMs).toISOString();
  }

  return { startIso, endExclusiveIso };
}
