import { useEffect, useRef, useState } from "react";
import { getTreeImpactApi, registerApi } from "../auth.api";
import { useNavigate, Link } from "react-router-dom";
import BrandWordmark from "../../../components/BrandWordmark";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import {
  isAuthEmailAllowed,
  STRONG_PASSWORD_REGEX,
} from "../../../../../auth.credentials.js";
import {
  FORM,
  firstFormErrorMessage,
  MSG_SUCCESS_REGISTER,
} from "../../../messages/userFacing.js";

export default function Register() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [treeGiven, setTreeGiven] = useState(0);
  const [animatedTreeGiven, setAnimatedTreeGiven] = useState(0);
  const givenPrevRef = useRef(0);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isValid, touchedFields, isSubmitted },
  } = useForm({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      phone_code: "",
      phone_local: "",
    },
  });

  const onValidSubmit = async (formData) => {
    setLoading(true);
    const payload = {
      email: formData.email.trim(),
      password: formData.password,
      phone: formData.phone_local.trim()
        ? `${(formData.phone_code || "").trim()}${formData.phone_local.replace(/\D/g, "")}`
        : undefined,
    };
    const [, err] = await registerApi(payload);
    setLoading(false);
    if (err) {
      toast.error(err);
      return;
    }
    toast.success(MSG_SUCCESS_REGISTER);
    navigate("/login");
  };

  const onInvalidSubmit = (fieldErrors) => {
    toast.error(
      firstFormErrorMessage(fieldErrors, ["email", "password", "phone_code", "phone_local"]),
    );
  };

  useEffect(() => {
    let cancelled = false;
    const refreshFromApi = async () => {
      const [data] = await getTreeImpactApi();
      if (cancelled || !data) return;
      setTreeGiven(Math.max(0, Number(data.given || 0)));
    };

    void refreshFromApi();
    const timer = setInterval(refreshFromApi, 90_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const target = Math.max(0, Number(treeGiven || 0));
    const start = givenPrevRef.current;
    if (start === target) return;
    const durationMs = 850;
    let rafId = 0;
    const startedAt = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startedAt) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(start + (target - start) * eased);
      setAnimatedTreeGiven(next);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        givenPrevRef.current = target;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [treeGiven]);

  const showError = (name) => Boolean((touchedFields[name] || isSubmitted) && errors[name]);
  const errEmail = showError("email");
  const errPassword = showError("password");
  const errPhoneCode = showError("phone_code");
  const errPhoneLocal = showError("phone_local");

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#eaf4ef] px-4 py-10">
      <div className="pointer-events-none absolute -left-16 top-8 h-64 w-64 rounded-full bg-emerald-300/40 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-emerald-500/25 blur-3xl" aria-hidden />

      <div className="relative w-full max-w-[430px] space-y-4">
        <section className="overflow-hidden rounded-3xl border border-white/55 bg-white/55 p-6 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-7">
          <div className="flex justify-center">
            <BrandWordmark />
          </div>
          <div className="mt-5 rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748b]">Given life to trees</p>
            <p className="mt-1 text-3xl font-black text-[#166534]">{animatedTreeGiven.toLocaleString()}</p>
          </div>
          <p className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-100/70 px-4 py-2.5 text-center text-xs font-medium leading-relaxed text-emerald-800 hover:underline hover:bg-emerald-100">
            <Link to="/welcome">
              Every digital menu helps reduce paper waste. Join today and help give more life to trees.
            </Link>
          </p>

          <form onSubmit={handleSubmit(onValidSubmit, onInvalidSubmit)} className="mt-6 space-y-3" noValidate>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#526075]">Email</span>
              <input
                {...register("email", {
                  required: FORM.emailRequired,
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: FORM.emailLooksInvalid,
                  },
                  validate: (v) =>
                    isAuthEmailAllowed(String(v ?? "").trim()) || FORM.emailProviderNotAllowed,
                })}
                className={`w-full rounded-2xl border bg-white/80 px-3 py-3 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:bg-white ${errEmail ? "border-red-300 focus:border-red-300" : "border-white/80 focus:border-emerald-300"
                  }`}
                placeholder="you@gmail.com"
                autoComplete="email"
                aria-invalid={errEmail}
              />
              {errEmail ? <p className="text-xs text-red-600">{errors.email?.message}</p> : null}
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#526075]">Password</span>
              <input
                type="password"
                {...register("password", {
                  required: FORM.passwordRequired,
                  pattern: {
                    value: STRONG_PASSWORD_REGEX,
                    message: FORM.passwordRules,
                  },
                })}
                className={`w-full rounded-2xl border bg-white/80 px-3 py-3 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:bg-white ${errPassword ? "border-red-300 focus:border-red-300" : "border-white/80 focus:border-emerald-300"
                  }`}
                placeholder="Create a secure password"
                autoComplete="new-password"
                aria-invalid={errPassword}
              />
              {errPassword ? <p className="text-xs text-red-600">{errors.password?.message}</p> : null}
            </label>

            <div className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#526075]">Phone (optional)</span>
              <div className="grid grid-cols-[110px_1fr] gap-0.5">
                <input
                  {...register("phone_code", {
                    validate: (value) => {
                      const code = String(value || "").trim();
                      const localDigits = String(getValues("phone_local") || "").replace(/\D/g, "");
                      const hasCode = code.length > 0;
                      const hasLocal = localDigits.length > 0;
                      if (hasLocal && !hasCode) return FORM.phoneCountryRequired;
                      if (hasCode && !/^\+\d{1,4}$/.test(code)) return FORM.phoneCountryFormat;
                      return true;
                    },
                  })}
                  className={`rounded-l-2xl border border-r-black/20 bg-white/80 px-3 py-3 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:bg-white ${errPhoneCode ? "border-red-300 focus:border-red-300" : "border-white/80 focus:border-emerald-300"
                    }`}
                  placeholder="+91"
                  inputMode="tel"
                  autoComplete="tel-country-code"
                  aria-invalid={errPhoneCode}
                />
                <input
                  {...register("phone_local", {
                    validate: (value) => {
                      const digits = String(value || "").replace(/\D/g, "");
                      const code = String(getValues("phone_code") || "").trim();
                      const hasDigits = digits.length > 0;
                      const hasCode = code.length > 0;
                      if (hasCode && !hasDigits) return FORM.phoneNumberRequired;
                      if (hasDigits && (digits.length < 6 || digits.length > 14))
                        return FORM.phoneDigitsLength;
                      return true;
                    },
                  })}
                  className={`w-full rounded-r-2xl border bg-white/80 px-3 py-3 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:bg-white ${errPhoneLocal ? "border-red-300 focus:border-red-300" : "border-white/80 focus:border-emerald-300"
                    }`}
                  placeholder="Phone number"
                  autoComplete="tel-national"
                  aria-invalid={errPhoneLocal}
                />
              </div>
              {errPhoneCode ? <p className="text-xs text-red-600">{errors.phone_code?.message}</p> : null}
              {errPhoneLocal ? <p className="text-xs text-red-600">{errors.phone_local?.message}</p> : null}
            </div>

            <button
              type="submit"
              disabled={loading || !isValid}
              className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111827] px-4 py-3 text-sm font-bold text-white shadow-md shadow-black/10 transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating account…" : "Sign up"}
            </button>
          </form>

          <div className="mt-4 border-t border-white/70 pt-4 text-center text-sm text-[#334155]">
            <p>
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-(--brand-e) hover:text-(--brand-e-dark)">
                Log in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
