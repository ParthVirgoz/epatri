import { useEffect, useRef, useState } from "react";
import { getTreeImpactApi, loginApi } from "../auth.api";
import { useAuthStore } from "../auth.store";
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
    MSG_SUCCESS_LOGIN,
} from "../../../messages/userFacing.js";

export default function Login() {
    const navigate = useNavigate();
    const login = useAuthStore((s) => s.login);
    const refreshUser = useAuthStore((s) => s.refreshUser);

    const [loading, setLoading] = useState(false);

    const [treeImpact, setTreeImpact] = useState({
        saved: 0,
        given: 0,
    });
    const [animatedSaved, setAnimatedSaved] = useState(0);
    const savedPrevRef = useRef(0);

    const {
        register,
        handleSubmit,
        formState: { errors, isValid, touchedFields, isSubmitted },
    } = useForm({
        mode: "onChange",
        reValidateMode: "onChange",
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onValidSubmit = async (formData) => {
        setLoading(true);

        const payload = {
            email: formData.email.trim(),
            password: formData.password,
        };

        const [data, error] = await loginApi(payload);
        setLoading(false);

        if (error) {
            toast.error(error);
            return;
        }

        login(data);
        await refreshUser();
        toast.success(MSG_SUCCESS_LOGIN);
        navigate("/", { replace: true });
    };

    const onInvalidSubmit = (fieldErrors) => {
        toast.error(firstFormErrorMessage(fieldErrors, ["email", "password"]));
    };

    useEffect(() => {
        let cancelled = false;

        const refreshFromApi = async () => {
            const [data] = await getTreeImpactApi();
            if (cancelled || !data) return;
            setTreeImpact({
                saved: Math.max(0, Number(data.saved || 0)),
                given: Math.max(0, Number(data.given || 0)),
            });
        };

        void refreshFromApi();
        const timer = setInterval(refreshFromApi, 90_000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, []);

    useEffect(() => {
        const target = Math.max(0, Number(treeImpact.saved || 0));
        const start = savedPrevRef.current;
        if (start === target) return;
        const durationMs = 850;
        let rafId = 0;
        const startedAt = performance.now();

        const tick = (now) => {
            const progress = Math.min((now - startedAt) / durationMs, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const next = Math.round(start + (target - start) * eased);
            setAnimatedSaved(next);
            if (progress < 1) {
                rafId = requestAnimationFrame(tick);
            } else {
                savedPrevRef.current = target;
            }
        };

        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [treeImpact.saved]);

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
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748b]">Saved life of trees</p>
                        <p className="mt-1 text-3xl font-black text-[#0f766e]">{animatedSaved.toLocaleString()}</p>
                    </div>

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
                                className={`w-full rounded-2xl border bg-white/80 px-3 py-3 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:bg-white ${(touchedFields.email || isSubmitted) && errors.email
                                        ? "border-red-300 focus:border-red-300"
                                        : "border-white/80 focus:border-emerald-300"
                                    }`}
                                placeholder="you@gmail.com"
                                autoComplete="email"
                                aria-invalid={Boolean((touchedFields.email || isSubmitted) && errors.email)}
                            />
                            {(touchedFields.email || isSubmitted) && errors.email ? (
                                <p className="text-xs text-red-600">{errors.email.message}</p>
                            ) : null}
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
                                className={`w-full rounded-2xl border bg-white/80 px-3 py-3 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:bg-white ${(touchedFields.password || isSubmitted) && errors.password
                                        ? "border-red-300 focus:border-red-300"
                                        : "border-white/80 focus:border-emerald-300"
                                    }`}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                aria-invalid={Boolean((touchedFields.password || isSubmitted) && errors.password)}
                            />
                            {(touchedFields.password || isSubmitted) && errors.password ? (
                                <p className="text-xs text-red-600">{errors.password.message}</p>
                            ) : null}
                        </label>
                        <div className="-mt-1 text-right">
                            <Link to="/forgot-password" className="text-xs font-medium text-emerald-800 hover:text-emerald-700 hover:underline">
                                Forgot password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !isValid}
                            className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111827] px-4 py-3 text-sm font-bold text-white shadow-md shadow-black/10 transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                                    Logging in, please wait…
                                </>
                            ) : (
                                "Log in"
                            )}
                        </button>
                    </form>
                    <div className="mt-4 border-t border-white/70 pt-4 text-center text-sm text-[#334155]">
                        <p>
                            Don&apos;t have an account?{" "}
                            <Link to="/register" className="font-semibold text-(--brand-e) hover:text-(--brand-e-dark)">
                                Sign up
                            </Link>
                        </p>
                        <p className="mt-1">
                            <Link to="/welcome" className="text-xs font-medium text-emerald-800 hover:text-emerald-700 hover:underline">
                                See how ePatri helped businesses
                            </Link>
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}