import { Link } from "react-router-dom";
import BrandWordmark from "../../../components/BrandWordmark";

export default function AdminLanding() {
  return (
    <div className="min-h-dvh bg-[var(--app-bg)] text-[#262626]">
      <header className="border-b border-[#dbdbdb] bg-white/90 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link to="/welcome" className="text-lg">
            <BrandWordmark />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/login"
              className="rounded-full px-4 py-2 text-sm font-semibold text-[#262626] hover:bg-[#f0f0f0]"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-[var(--brand-e)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-e-dark)]"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-14 px-4 py-12 pb-24">
        <section className="space-y-4 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-e)]">
            Partner tools
          </p>
          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-[#1a1a1a] sm:text-4xl">
            Your menu, online — without printing another stack of paper.
          </h1>
          <p className="max-w-xl text-pretty text-lg text-[#525252]">
            ePatri helps cafés and restaurants share a digital menu from one link. Guests open your PDF on their
            phone; you get simple insights on who stopped by.
          </p>
        </section>

        <section className="rounded-2xl border border-[#dbdbdb] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-[#1a1a1a]">What you get today</h2>
          <ul className="mt-4 space-y-3 text-sm text-[#404040]">
            <li className="flex gap-3">
              <span className="mt-0.5 font-semibold text-[var(--brand-e)]">·</span>
              <span>
                <strong className="text-[#262626]">Menu page</strong> — upload a PDF once; guests see it from your
                public link (Instagram bio, QR, Link-in-bio sharing).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 font-semibold text-[var(--brand-patri)]">·</span>
              <span>
                <strong className="text-[#262626]">Insights</strong> — device types, browsers, and opens over time so
                you know what&apos;s working.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 font-semibold text-[var(--brand-e)]">·</span>
              <span>
                <strong className="text-[#262626]">Share</strong> — copy or share your menu link in one tap from the
                app header.
              </span>
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[#cfe8d9] bg-gradient-to-br from-[#f0faf4] to-[#fff8f0] p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-[#1a4d2e]">Why it matters for the planet</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#3d5245]">
            Printed menus mean paper, reprints after every tweak, and more trees turned into single-use sheets.
            Switching to an <strong>e-menu</strong> is a small habit that adds up: fewer reprints, less waste, and a
            clearer signal to guests that you care about resources. We&apos;re building ePatri so good hospitality
            and a lighter footprint can go together.
          </p>
        </section>

        <section className="rounded-2xl border border-[#fde6cc] bg-[#fffaf5] p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-[#8b4510]">Founding partners — free to start</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#5c4030]">
            We&apos;re inviting the <strong>first businesses</strong> to grow with us: <strong>no charge for your first
            100 days</strong> while we polish the product with your feedback. After that, paid plans will help us keep
            improving ePatri and <strong>fund real-world impact</strong> — we&apos;re aiming to tie subscriptions to
            tree-planting and conservation partners so choosing digital menus also helps green the planet.
          </p>
          <p className="mt-2 text-xs text-[#8a7355]">
            Details and timelines will be shared in the app before any billing starts.
          </p>
        </section>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/register"
            className="rounded-xl bg-[var(--brand-e)] py-3.5 text-center text-sm font-semibold text-white hover:bg-[var(--brand-e-dark)]"
          >
            Create your place
          </Link>
          <Link
            to="/login"
            className="rounded-xl border border-[#dbdbdb] bg-white py-3.5 text-center text-sm font-semibold text-[#262626] hover:bg-[#fafafa]"
          >
            I already have an account
          </Link>
        </div>
      </main>
    </div>
  );
}
