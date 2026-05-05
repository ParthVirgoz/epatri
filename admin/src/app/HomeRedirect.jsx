import { Navigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/auth.store";
import FullScreenLoading from "../shared/components/FullScreenLoading";

/** `/` → `/app/menu` if signed in, else `/welcome` (after auth finishes loading). */
export default function HomeRedirect() {
  const loading = useAuthStore((s) => s.loading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (loading) {
    return <FullScreenLoading message="Checking your session…" />;
  }

  if (isAuthenticated) {
    const hasBusiness = Boolean(user?.current_context?.business_id || user?.owned_businesses?.length);
    const hasLocation = Boolean(user?.accessible_locations?.length);
    if (!hasBusiness || !hasLocation) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/app/menu" replace />;
  }

  return <Navigate to="/welcome" replace />;
}
