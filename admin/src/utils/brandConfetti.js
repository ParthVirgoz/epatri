import JSConfetti from "js-confetti";

/** Brand + festive mix (ConfettiPage-style random colour variety). */
const PALETTE = [
  "#1e9459",
  "#34d399",
  "#86efac",
  "#ff9423",
  "#fbbf24",
  "#fde047",
  "#ffffff",
  "#38bdf8",
  "#f472b6",
  "#c084fc",
  "#fb923c",
  "#a7f3d0",
];

/** Above app modals (z~100) and Sonner toasts (~1e9). */
const CONFETTI_Z = "2000000000";

const RANDOM_PHASE_MS = 3800;
const CLEANUP_DELAY_MS = 2200;

function syncCanvasToViewport(canvas) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}

function createFullViewportCanvas() {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    top: "0",
    left: "0",
    zIndex: CONFETTI_Z,
    pointerEvents: "none",
  });
  syncCanvasToViewport(canvas);
  document.body.appendChild(canvas);
  return canvas;
}

function pickRandomColors(n) {
  const shuffled = [...PALETTE].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

function rnd(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Random bursts along the top (like confettipage.com-style shower) plus classic side streams.
 */
async function runRandomConfettiPageStyle(js, canvas) {
  const end = Date.now() + RANDOM_PHASE_MS;

  while (Date.now() < end) {
    const { width } = canvas.getBoundingClientRect();
    const x = rnd(0, Math.max(1, width));
    const y = rnd(-50, 90);
    void js.addConfettiAtPosition({
      confettiDispatchPosition: { x, y },
      confettiColors: pickRandomColors(5 + Math.floor(Math.random() * 4)),
      confettiRadius: 4 + Math.random() * 4,
      confettiNumber: 10 + Math.floor(Math.random() * 22),
    });
    await new Promise((r) => setTimeout(r, rnd(28, 95)));
  }

  /* Classic full-width “paper rain” from the sides (similar to many embed confetti scripts). */
  void js.addConfetti({
    confettiColors: pickRandomColors(8),
    confettiNumber: 320,
    confettiRadius: 6,
  });
  await new Promise((r) => setTimeout(r, 200));
  void js.addConfetti({
    confettiColors: pickRandomColors(8),
    confettiNumber: 260,
    confettiRadius: 5,
  });
  await new Promise((r) => setTimeout(r, 400));
}

/**
 * Random falling-style confetti (inspired by confettipage.com-style embeds) + viewport sync while running.
 * Respects `prefers-reduced-motion`.
 */
export function runBrandConfettiBurst() {
  if (
    typeof window === "undefined" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const canvas = createFullViewportCanvas();
  const js = new JSConfetti({ canvas });

  let resizeRaf = 0;
  const onResize = () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      syncCanvasToViewport(canvas);
    });
  };
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);

  const run = async () => {
    try {
      await runRandomConfettiPageStyle(js, canvas);
    } catch {
      /* ignore animation teardown races */
    } finally {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      window.setTimeout(() => {
        try {
          js.destroyCanvas();
        } catch {
          canvas.remove();
        }
      }, CLEANUP_DELAY_MS);
    }
  };

  void run();
}
