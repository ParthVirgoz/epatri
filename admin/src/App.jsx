import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";

import { useEffect } from "react";
import { useAuthStore } from "./features/auth/auth.store";

function App() {
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    initAuth();
  }, []);

  return <RouterProvider router={router} />;
}

export default App;