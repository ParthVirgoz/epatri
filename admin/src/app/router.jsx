import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

import ProtectedRoute from "../shared/components/ProtectedRoute";
import AdminLayout from "../layouts/AdminLayout";
import HomeRedirect from "./HomeRedirect";
import AppErrorPage from "../shared/components/AppErrorPage";

import Login from "../features/auth/pages/Login";
import Register from "../features/auth/pages/Register";
import ForgotPassword from "../features/auth/pages/ForgotPassword";
import ResetPassword from "../features/auth/pages/ResetPassword";
import AdminLanding from "../features/marketing/pages/AdminLanding";

import MenuStudioMvp from "../features/menu/pages/MenuStudioMvp";
import AnalyticsDashboard from "../features/analytics/AnalyticsDashboard";
import Profile from "../features/profile/pages/Profile";
import Onboarding from "../features/onboarding/pages/Onboarding";

function AppRoot() {
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppRoot />,
    errorElement: <AppErrorPage />,
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: "welcome", element: <AdminLanding /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "reset-password", element: <ResetPassword /> },
      {
        path: "onboarding",
        element: (
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        ),
      },
      {
        element: (
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            path: "app",
            children: [
              { index: true, element: <Navigate to="/app/menu" replace /> },
              { path: "menu", element: <MenuStudioMvp /> },
              { path: "insights", element: <AnalyticsDashboard /> },
              { path: "profile", element: <Profile /> },
            ],
          },
          { path: "menu", element: <Navigate to="/app/menu" replace /> },
          { path: "insights", element: <Navigate to="/app/insights" replace /> },
          { path: "profile", element: <Navigate to="/app/profile" replace /> },
        ],
      },
      {
        path: "analytics",
        element: (
          <ProtectedRoute>
            <Navigate to="/app/insights" replace />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
