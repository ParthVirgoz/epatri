import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import BrandWordmark from "../../../components/BrandWordmark";
import { forgotPasswordApi } from "../auth.api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    const trimmed = String(email || "").trim();
    if (!trimmed) {
      toast.error("Email is required");
      return;
    }
    setLoading(true);
    const [, err] = await forgotPasswordApi({ email: trimmed });
    setLoading(false);
    if (err) {
      toast.error(err);
      return;
    }
    setDone(true);
    toast.success("Reset email sent");
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

          <h1 className="mt-5 text-center text-lg font-semibold text-[#0f172a]">Forgot password</h1>
          <p className="mt-1 text-center text-sm text-[#64748b]">
            Enter your account email and we will send you a reset link.
          </p>

          {!done ? (
            <form onSubmit={onSubmit} className="mt-5 space-y-3" noValidate>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#526075]">Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/80 bg-white/80 px-3 py-3 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-emerald-300 focus:bg-white"
                  placeholder="you@gmail.com"
                  autoComplete="email"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111827] px-4 py-3 text-sm font-bold text-white shadow-md shadow-black/10 transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          ) : (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              Check your email inbox for the password reset link.
            </div>
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
