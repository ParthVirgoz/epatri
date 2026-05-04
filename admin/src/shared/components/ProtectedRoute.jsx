import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../features/auth/auth.store";

const ProtectedRoute = ({ children }) => {
  const loading = useAuthStore((s) => s.loading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--app-bg)] text-sm text-[#8e8e8e]">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;