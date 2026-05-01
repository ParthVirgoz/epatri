import { Outlet, NavLink, useNavigate } from "react-router-dom";
import BrandWordmark from "../components/BrandWordmark";
import ShareMenuLinkButton from "../components/ShareMenuLinkButton";

function NavIcon({ children, active }) {
  return (
    <span
      className={`flex h-6 w-6 items-center justify-center transition-opacity ${
        active ? "opacity-100" : "opacity-45"
      }`}
      aria-hidden
    >
      {children}
    </span>
  );
}

const AdminLayout = () => {
  const navigate = useNavigate();

  const tabClass = ({ isActive }) =>
    `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold tracking-wide ${
      isActive ? "text-[#262626]" : "text-[#737373]"
    }`;

  return (
    <div className="flex min-h-dvh max-h-dvh flex-col bg-[var(--app-bg)]">
      <header
        className="sticky top-0 z-20 grid h-[var(--nav-h)] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-neutral-200/90 bg-white/85 px-[max(8px,env(safe-area-inset-left))] pr-[max(8px,env(safe-area-inset-right))] shadow-[0_1px_0_rgba(0,0,0,0.03)] backdrop-blur-xl backdrop-saturate-150"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="min-w-0 justify-self-start">
        </div>
        <button
          type="button"
          onClick={() => navigate("/app/menu")}
          className="select-none justify-self-center text-lg"
        >
          <BrandWordmark />
        </button>
        <div className="flex min-w-0 items-center justify-end gap-2">
          <ShareMenuLinkButton />
        </div>
      </header>

      <main
        className="flex-1 overflow-y-auto h-[calc(100dvh-var(--nav-h)-var(--bottom-nav-h))] max-h-[calc(100dvh-var(--nav-h)-var(--bottom-nav-h))] lg:h-[calc(100dvh-var(--nav-h)-var(--bottom-nav-h))] lg:max-h-[calc(100dvh-var(--nav-h)-var(--bottom-nav-h))]"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <Outlet />
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-neutral-200/90 bg-white/92 backdrop-blur-xl backdrop-saturate-150"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Main"
      >
        <NavLink to="/app/menu" end className={tabClass}>
          {({ isActive }) => (
            <>
              <NavIcon active={isActive}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="17" x2="14" y2="17" />
                </svg>
              </NavIcon>
              Menu
            </>
          )}
        </NavLink>
        <NavLink to="/app/insights" className={tabClass}>
          {({ isActive }) => (
            <>
              <NavIcon active={isActive}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M4 19V5M9 19V9M14 19v-6M19 19V12" strokeLinecap="round" />
                </svg>
              </NavIcon>
              Insights
            </>
          )}
        </NavLink>
        <NavLink to="/app/profile" className={tabClass}>
          {({ isActive }) => (
            <>
              <NavIcon active={isActive}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20v-1c0-2.5 2-4.5 7-4.5s7 2 7 4.5v1" strokeLinecap="round" />
                </svg>
              </NavIcon>
              Profile
            </>
          )}
        </NavLink>
      </nav>
    </div>
  );
};

export default AdminLayout;
