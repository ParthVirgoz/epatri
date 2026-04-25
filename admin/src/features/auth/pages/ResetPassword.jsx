import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import BrandWordmark from "../../../components/BrandWordmark";
import { resetPasswordApi } from "../auth.api";

function pickRecoveryToken() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  return (
    hash.get("access_token") ||
    query.get("access_token") ||
    hash.get("token") ||
    query.get("token") ||
    ""
  );
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const token = useMemo(() => pickRecoveryToken(), []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Recovery token is missing or expired");
      return;
    }
    if (!password) {
      toast.error("Password is required");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    const [, err] = await resetPasswordApi({
      password,
      access_token: token,
    });
    setLoading(false);
    if (err) {
      toast.error(err);
      return;
    }

    toast.success("Password updated. Please login.");
    navigate("/login", { replace: true });
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#eaf4ef] px-4 py-10">
      <div className="pointer-events-none absolute -left-16 top-8 h-64 w-64 rounded-full bg-emerald-300/40 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-emerald-500/25 blur-3xl" aria-hidden />

      <div className="relative w-full max-w-[430px]">
        <section className="overflow-hidden rounded-3xl border border-white/55 bg-white/55 p-6 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-7">
          <div className="flex justify-center">
            <BrandWordmark />
          </div>

          <h1 className="mt-5 text-center text-lg font-semibold text-[#0f172a]">Reset password</h1>
          <p className="mt-1 text-center text-sm text-[#64748b]">
            Create your new password to continue.
          </p>

          {!token ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Recovery token is missing. Please open the latest reset link from your email.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-5 space-y-3" noValidate>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#526075]">New password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-white/80 bg-white/80 px-3 py-3 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-emerald-300 focus:bg-white"
                  placeholder="Create new password"
                  autoComplete="new-password"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#526075]">Confirm password</span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-2xl border border-white/80 bg-white/80 px-3 py-3 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-emerald-300 focus:bg-white"
                  placeholder="Repeat password"
                  autoComplete="new-password"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111827] px-4 py-3 text-sm font-bold text-white shadow-md shadow-black/10 transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>
          )}

          <div className="mt-5 border-t border-white/70 pt-4 text-center text-sm text-[#334155]">
            <Link to="/login" className="font-semibold text-(--brand-e) hover:text-(--brand-e-dark)">
              Back to login
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
