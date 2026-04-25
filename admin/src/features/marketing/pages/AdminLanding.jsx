import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import BrandWordmark from "../../../components/BrandWordmark";
import { apiClient } from "../../../shared/services/apiClient";

function useCountUp(target, durationMs = 900) {
  const [animated, setAnimated] = useState(0);
  const previousRef = useRef(0);

  useEffect(() => {
    const nextTarget = Number.isFinite(Number(target)) ? Number(target) : 0;
    const start = previousRef.current;
    if (start === nextTarget) return;
    let rafId = 0;
    const startedAt = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startedAt) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(start + (nextTarget - start) * eased);
      setAnimated(next);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        previousRef.current = nextTarget;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, durationMs]);

  return animated;
}

export default function AdminLanding() {
  const [impactStats, setImpactStats] = useState({
    saved: 0,
    given: 0,
    menus_created: 0,
    business_growth_percentage: 0,
    environment_saving_percentage: 0,
    area_coverage_count: 0,
  });

  useEffect(() => {
    let active = true;
    apiClient.get("/public/impact/trees")
      .then((res) => res?.data || null)
      .then((payload) => {
        if (!active || !payload) return;
        setImpactStats({
          saved: Number(payload.saved || 0),
          given: Number(payload.given || 0),
          menus_created: Number(payload.menus_created || 0),
          business_growth_percentage: Number(payload.business_growth_percentage || 0),
          environment_saving_percentage: Number(payload.environment_saving_percentage || 0),
          area_coverage_count: Number(payload.area_coverage_count || 0),
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const treesImpacted = useCountUp(Math.max(0, Number(impactStats.saved || 0) + Number(impactStats.given || 0)));
  const menusCreated = useCountUp(Math.max(0, impactStats.menus_created));
  const businessGrowth = useCountUp(Math.round(impactStats.business_growth_percentage));
  const environmentSaving = useCountUp(Math.round(impactStats.environment_saving_percentage));
  const areaCoverage = useCountUp(Math.max(0, impactStats.area_coverage_count));

  return (
    <div className="landing-admin min-h-dvh bg-[#070707] text-[#f5f5f5]">
      <div className="landing-admin__orb landing-admin__orb--e" aria-hidden />
      <div className="landing-admin__orb landing-admin__orb--p" aria-hidden />
      <div className="landing-admin__grain" aria-hidden />
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/75 px-4 shadow-[0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/welcome" className="text-lg">
            <BrandWordmark />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/login"
              className="rounded-full px-4 py-2 text-sm font-semibold text-[#d5d5d5] hover:bg-white/10"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#121212] hover:bg-neutral-200"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main className="landing-admin__main mx-auto max-w-6xl space-y-10 px-4 py-10 pb-24">
        <section className="reveal reveal--1 rounded-3xl border border-white/10 bg-linear-to-br from-[#0f1412] via-[#111111] to-[#18120e] p-7 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.65)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9ecab1]">
            Business growth · cost cutting
          </p>
          {/* <div className="landing-admin__chip">Founding offer: 100 days free</div> */}
          <div className="mt-2 grid gap-5 md:grid-cols-[1.4fr_1fr] md:items-end">
            <div>
              <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-[#f5f5f5] sm:text-5xl">
                One menu, one step today -{" "}
                <span className="landing-admin__glow-text">save cost now and protect the next generation.</span>
              </h1>
              <p className="mt-3 max-w-2xl text-pretty text-base text-[#b8b8b8] sm:text-lg">
                ePatri helps businesses increase customer reach, reduce recurring menu printing cost, and cut daily waste
                using one digital menu flow guests can open instantly.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-transform duration-200 hover:-translate-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#9f9f9f]">Start now</p>
              <p className="mt-1 text-sm text-[#c5c5c5]">Create your account and publish your menu in minutes.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Link
                  to="/register"
                  className="landing-admin__cta rounded-xl bg-white px-4 py-2.5 text-center text-sm font-semibold text-[#111] hover:bg-neutral-200"
                >
                  Create your menu
                </Link>
                <Link
                  to="/login"
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-center text-sm font-semibold text-[#f2f2f2] hover:bg-white/10"
                >
                  I have an account
                </Link>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="landing-admin__pill">Cost cutting</span>
                <span className="landing-admin__pill">Waste decreasing</span>
                <span className="landing-admin__pill">Growth insights</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <article className="reveal reveal--2 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#9ecab1]">Trees impacted</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[#f5f5f5]">
              {Math.max(0, treesImpacted).toLocaleString()}
            </p>
          </article>
          <article className="reveal reveal--3 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#9ecab1]">Menus created</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[#f5f5f5]">
              {Math.max(0, menusCreated).toLocaleString()}
            </p>
          </article>
          <article className="reveal reveal--4 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#9ecab1]">Business growth</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[#f5f5f5]">
              {impactStats.business_growth_percentage >= 0 ? "+" : ""}
              {Math.round(businessGrowth)}%
            </p>
          </article>
          <article className="reveal reveal--5 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#9ecab1]">Environment saving</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[#f5f5f5]">
              {Math.round(environmentSaving)}%
            </p>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="reveal reveal--6 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#9ecab1]">Menu page</p>
            <p className="mt-2 text-sm leading-relaxed text-[#b3b3b3]">
              Publish once and update anytime without reprinting stacks of paper menus.
            </p>
          </article>
          <article className="reveal reveal--7 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#ffca95]">Cost control</p>
            <p className="mt-2 text-sm leading-relaxed text-[#b3b3b3]">
              Reduce recurring printing and disposal expenses while keeping your menu always current.
            </p>
          </article>
          <article className="reveal reveal--8 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#9ecab1]">Waste decreasing</p>
            <p className="mt-2 text-sm leading-relaxed text-[#b3b3b3]">
              One QR menu reduces paper waste and helps build a cleaner brand image for eco-aware guests.
            </p>
          </article>
        </section>

        <section className="reveal reveal--9 rounded-2xl border border-white/10 bg-linear-to-br from-[#101713] to-[#17120d] p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-[#d8f1e2]">One menu today, safer future for next generation</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#a7b6ad]">
            ePatri helps you improve growth and guest experience while reducing operational waste. Fewer reprints mean
            lower cost and fewer trees cut for short-lived menu paper. One menu, one step today, supports stronger
            business performance and better environmental outcomes for the future.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[#a7b6ad]">
            Current area coverage from active ePatri usage: <strong>{Math.max(0, areaCoverage).toLocaleString()}</strong>.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[#a7b6ad]">
            Guests can also support this impact by asking for ePatri menu first — more asks mean more trees protected,
            more planting support, and more environmental care across covered areas.
          </p>
        </section>

        {/* <section className="reveal reveal--6 rounded-2xl border border-[#eadac9] bg-[#fff7ef] p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-[#6c4a2e]">Founding partners — free to start</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#80644a]">
            We&apos;re inviting the <strong>first businesses</strong> to grow with us: <strong>no charge for your first
            100 days</strong> while we polish the product with your feedback. After that, paid plans will help us keep
            improving ePatri and <strong>fund real-world impact</strong> — we&apos;re aiming to tie subscriptions to
            tree-planting and conservation partners so choosing digital menus also helps green the planet.
          </p>
          <p className="mt-2 text-xs text-[#957761]">
            Details and timelines will be shared in the app before any billing starts.
          </p>
        </section> */}
      </main>
      <style>{`
        .landing-admin {
          position: relative;
          overflow-x: clip;
        }
        .landing-admin__main,
        .landing-admin header {
          position: relative;
          z-index: 1;
        }
        .landing-admin__grain {
          position: fixed;
          inset: -20vh -8vw;
          pointer-events: none;
          z-index: 0;
          opacity: 0.28;
          background:
            radial-gradient(circle at 18% 20%, rgba(30, 148, 89, 0.14), transparent 45%),
            radial-gradient(circle at 82% 74%, rgba(255, 148, 35, 0.14), transparent 42%),
            repeating-linear-gradient(
              90deg,
              rgba(0, 0, 0, 0.03) 0 1px,
              transparent 1px 72px
            ),
            repeating-linear-gradient(
              0deg,
              rgba(0, 0, 0, 0.024) 0 1px,
              transparent 1px 72px
            );
          mask-image: radial-gradient(circle at 50% 40%, #000 28%, transparent 80%);
        }
        .landing-admin__orb {
          position: fixed;
          width: 25rem;
          height: 25rem;
          border-radius: 999px;
          filter: blur(100px);
          opacity: 0.24;
          pointer-events: none;
          animation: drift 16s ease-in-out infinite;
          z-index: 0;
        }
        .landing-admin__orb--e {
          top: -9rem;
          left: -8rem;
          background: radial-gradient(circle, #1e9459 0%, rgba(30,148,89,0) 72%);
        }
        .landing-admin__orb--p {
          right: -8rem;
          bottom: -10rem;
          background: radial-gradient(circle, #ff9423 0%, rgba(255,148,35,0) 72%);
          animation-direction: reverse;
        }
        .landing-admin__chip {
          display: inline-flex;
          margin-top: 0.7rem;
          align-items: center;
          border-radius: 999px;
          border: 1px solid #efdecf;
          background: #fff5ea;
          color: #8c623d;
          font-size: 0.73rem;
          font-weight: 700;
          padding: 0.28rem 0.62rem;
          letter-spacing: 0.03em;
          animation: pulseGlow 2.6s ease-in-out infinite;
        }
        .landing-admin__glow-text {
          background: linear-gradient(90deg, #2f7f5b 0%, #4f9e79 35%, #cd7e2f 70%, #2f7f5b 100%);
          background-size: 220% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: shimmerText 8s linear infinite;
        }
        .landing-admin__cta {
          position: relative;
          overflow: hidden;
          box-shadow: 0 14px 30px rgba(16, 64, 43, 0.24), 0 1px 0 rgba(255, 255, 255, 0.25) inset;
        }
        .landing-admin__cta::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-120%);
          background: linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.32) 50%, transparent 80%);
          animation: ctaSweep 3.8s ease-in-out infinite;
          pointer-events: none;
        }
        .landing-admin__pill {
          border-radius: 999px;
          border: 1px solid rgba(27, 46, 35, 0.14);
          background: rgba(255, 255, 255, 0.78);
          color: #5f6f66;
          font-size: 0.68rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 0.32rem 0.58rem;
          font-weight: 700;
        }
        .reveal {
          opacity: 0;
          transform: translateY(12px);
          animation: revealUp 0.6s ease forwards;
        }
        .reveal--1 { animation-delay: 0.05s; }
        .reveal--2 { animation-delay: 0.1s; }
        .reveal--3 { animation-delay: 0.15s; }
        .reveal--4 { animation-delay: 0.2s; }
        .reveal--5 { animation-delay: 0.25s; }
        .reveal--6 { animation-delay: 0.3s; }
        .reveal--7 { animation-delay: 0.35s; }
        .reveal--8 { animation-delay: 0.4s; }
        .reveal--9 { animation-delay: 0.45s; }
        .landing-admin article {
          transition: transform 0.26s ease, border-color 0.26s ease, background-color 0.26s ease, box-shadow 0.26s ease;
        }
        .landing-admin article:hover {
          transform: translateY(-3px);
          border-color: rgba(33, 54, 43, 0.2);
          box-shadow: 0 16px 32px rgba(23, 52, 38, 0.15);
        }
        @keyframes revealUp { to { opacity: 1; transform: translateY(0); } }
        @keyframes drift {
          0%, 100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(14px,16px,0) scale(1.04); }
        }
        @keyframes shimmerText {
          0% { background-position: 0% 0%; }
          100% { background-position: 220% 0%; }
        }
        @keyframes ctaSweep {
          0%, 38% { transform: translateX(-120%); }
          58%, 100% { transform: translateX(120%); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 rgba(255,148,35,0); }
          50% { box-shadow: 0 0 1rem rgba(255,148,35,0.3); }
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-admin__orb,
          .reveal,
          .landing-admin__chip,
          .landing-admin__glow-text,
          .landing-admin__cta::after {
            animation: none;
            opacity: 1;
            transform: none;
          }
          .landing-admin article,
          .landing-admin__cta {
            transition: none;
          }
          .landing-admin__glow-text {
            background: none;
            color: inherit;
          }
        }
      `}</style>
    </div>
  );
}
