import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../features/auth/auth.store";
import FullScreenLoading from "./FullScreenLoading";

const ProtectedRoute = ({ children }) => {
  const loading = useAuthStore((s) => s.loading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (loading) {
    return <FullScreenLoading message="Loading your workspace…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;