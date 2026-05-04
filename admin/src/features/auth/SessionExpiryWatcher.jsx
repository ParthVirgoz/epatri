import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "./auth.store";
import { getAccessToken, isAdminSessionExpired } from "./auth.storage";
import { getSessionInvalidEventName } from "./auth.sessionEvents";

const POLL_MS = 30_000;

function flushExpiredSession(logout, navigate) {
  if (!getAccessToken()) return;
  if (!isAdminSessionExpired()) return;
  logout();
  navigate("/welcome", { replace: true });
}

/** Keeps UI in sync with the 6h session deadline and API-layer auth clears. */
export default function SessionExpiryWatcher() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  useEffect(() => {
    const onInvalid = () => {
      logout();
      navigate("/welcome", { replace: true });
    };

    const tick = () => flushExpiredSession(logout, navigate);

    tick();
    const id = setInterval(tick, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    const ev = getSessionInvalidEventName();
    window.addEventListener(ev, onInvalid);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      window.removeEventListener(ev, onInvalid);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [logout, navigate]);

  return null;
}
