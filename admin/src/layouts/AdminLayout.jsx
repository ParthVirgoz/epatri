import { Outlet, Link } from "react-router-dom";
import { useAuthStore } from "../features/auth/auth.store";

const AdminLayout = () => {
  const { logout } = useAuthStore();

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-black text-white p-4">
        <h2 className="text-lg font-bold mb-4">Admin</h2>

        <nav className="space-y-2">
          <Link to="/dashboard" className="block hover:underline">
            Dashboard
          </Link>
          <Link to="/menu" className="block hover:underline">
            Menu
          </Link>
          <button
            onClick={logout}
            className="mt-4 text-red-400"
          >
            Logout
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-6 bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;