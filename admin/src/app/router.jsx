import { createBrowserRouter } from "react-router-dom";

import ProtectedRoute from "../shared/components/ProtectedRoute";
import AdminLayout from "../layouts/AdminLayout";

import Login from "../features/auth/pages/Login";
import Register from "../features/auth/pages/Register";

import Dashboard from "../features/dashboard/pages/Dashboard";
import MenuUpload from "../features/menu/pages/MenuUpload";
// import MenuBuilder from "../features/pdf/pages/MenuBuilder";
// import MenuBuilder2 from "../features/pdf/2/MenuBuilderTemplate2";
import AnalyticsDashboard from '../features/analytics/AnalyticsDashboard';

export const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/register",
        element: <Register />,
    },
    {
        path: "/analytics",
        element: <AnalyticsDashboard />,
    },
    // {
    //     path: "/pdf",
    //     element: <MenuBuilder />,
    // },
    // {
    //     path: "/pdf2",
    //     element: <MenuBuilder2 />,
    // },
    {
        path: "/",
        element: (
            <ProtectedRoute>
                <AdminLayout />
            </ProtectedRoute>
        ),
        children: [
            {
                path: "dashboard",
                element: <Dashboard />,
            },
            {
                path: "menu",
                element: <MenuUpload />,
            },
        ],
    },
]);