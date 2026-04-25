import confetti from "canvas-confetti";

/** Menu-open totals in the selected Insights range — celebrate crossing these thresholds. */
export const MENU_OPEN_MILESTONES = [
  100, 250, 500, 1_000, 2_000, 5_000, 10_000, 15_000, 25_000, 50_000, 75_000, 100_000, 250_000, 500_000,
];

/**
 * @param {string} shopUsername
 * @param {string | null} insightLocationId
 * @param {string} activePreset today | 7d | 30d | month | custom
 * @param {{ start: string; end: string }} dateRange
 */
export function getMilestoneStorageKey(shopUsername, insightLocationId, activePreset, dateRange) {
  const loc = insightLocationId || "all";
  const rangePart =
    activePreset === "custom" ? `${dateRange.start}_${dateRange.end}` : activePreset;
  return `epatri_insight_menu_milestone_v1:${shopUsername}:${loc}:${rangePart}`;
}

/** Largest milestone in {@link MENU_OPEN_MILESTONES} that `totalViews` has reached (0 if none). */
export function eligibleMilestoneTotal(totalViews) {
  const t = Number(totalViews) || 0;
  let best = 0;
  for (const m of MENU_OPEN_MILESTONES) {
    if (m <= t) best = m;
    else break;
  }
  return best;
}

export function readCelebratedMaxMilestone(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const o = JSON.parse(raw);
    return typeof o.celebratedMax === "number" && o.celebratedMax >= 0 ? o.celebratedMax : 0;
  } catch {
    return 0;
  }
}

export function writeCelebratedMaxMilestone(key, celebratedMax) {
  try {
    localStorage.setItem(key, JSON.stringify({ celebratedMax }));
  } catch {
    /* private mode / quota */
  }
}

export function runMenuOpenMilestoneConfetti() {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }
  const burst = () => {
    confetti({
      particleCount: 110,
      spread: 72,
      origin: { y: 0.68 },
      scalar: 1.05,
      ticks: 200,
      colors: ["#1e9459", "#34d399", "#fbbf24", "#ffffff", "#86efac"],
    });
  };
  burst();
  setTimeout(burst, 220);
  setTimeout(() => {
    confetti({
      particleCount: 60,
      angle: 60,
      spread: 65,
      origin: { x: 0, y: 0.65 },
      colors: ["#1e9459", "#a7f3d0"],
    });
    confetti({
      particleCount: 60,
      angle: 120,
      spread: 65,
      origin: { x: 1, y: 0.65 },
      colors: ["#1e9459", "#a7f3d0"],
    });
  }, 400);
}
