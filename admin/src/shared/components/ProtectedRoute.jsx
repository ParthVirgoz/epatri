import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../features/auth/auth.store";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;