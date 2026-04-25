import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import BrandWordmark from "../../components/BrandWordmark";

export default function AppErrorPage() {
  const err = useRouteError();
  const title = isRouteErrorResponse(err)
    ? `Error ${err.status}`
    : "Something went wrong";
  const message = isRouteErrorResponse(err)
    ? err.statusText || "Request failed"
    : err?.message || "Unexpected application error.";

  return (
    <div className="min-h-dvh bg-[#f7faf8] px-4 py-10">
      <main className="mx-auto max-w-lg rounded-2xl border border-[#dbdbdb] bg-white p-6 text-center shadow-sm">
        <div className="flex justify-center">
          <BrandWordmark className="h-7 w-auto" />
        </div>
        <h1 className="mt-2 text-xl font-bold text-[#171717]">{title}</h1>
        <p className="mt-2 text-sm text-[#525252]">{message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            to="/app/menu"
            className="rounded-lg bg-[#171717] px-4 py-2 text-sm font-semibold text-white"
          >
            Go to menu
          </Link>
          <Link
            to="/app/profile"
            className="rounded-lg border border-[#dbdbdb] bg-white px-4 py-2 text-sm font-semibold text-[#262626]"
          >
            Open profile
          </Link>
        </div>
      </main>
    </div>
  );
}
