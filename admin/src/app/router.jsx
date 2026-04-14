import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";

import ProtectedRoute from "../shared/components/ProtectedRoute";
import AdminLayout from "../layouts/AdminLayout";
import HomeRedirect from "./HomeRedirect";

import Login from "../features/auth/pages/Login";
import Register from "../features/auth/pages/Register";
import AdminLanding from "../features/marketing/pages/AdminLanding";

import MenuUpload from "../features/menu/pages/MenuUpload";
import AnalyticsDashboard from "../features/analytics/AnalyticsDashboard";
import Profile from "../features/profile/pages/Profile";

function AppRoot() {
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppRoot />,
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: "welcome", element: <AdminLanding /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      {
        element: (
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        ),
        children: [
          { path: "menu", element: <MenuUpload /> },
          { path: "insights", element: <AnalyticsDashboard /> },
          { path: "profile", element: <Profile /> },
        ],
      },
      {
        path: "analytics",
        element: (
          <ProtectedRoute>
            <Navigate to="/insights" replace />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
