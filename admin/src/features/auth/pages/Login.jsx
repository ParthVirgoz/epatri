import { useState } from "react";
import { loginApi } from "../auth.api";
import { useAuthStore } from "../auth.store";
import { useNavigate, Link } from "react-router-dom";
import BrandWordmark from "../../../components/BrandWordmark";

export default function Login() {
    const navigate = useNavigate();
    const login = useAuthStore((s) => s.login);
    const refreshUser = useAuthStore((s) => s.refreshUser);

    const [form, setForm] = useState({
        email: "",
        password: "",
    });
    const [apiError, setApiError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const [data, error] = await loginApi(form);

        if (error) {
            setApiError(error);
            return;
        }

        setApiError(null);
        login(data);
        await refreshUser();
        navigate("/menu", { replace: true });
    };

    return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--app-bg)] px-4 py-10">
            <div className="w-full max-w-[350px] space-y-6">
                <div className="border border-[#dbdbdb] bg-white px-10 py-10 sm:rounded-sm">
                    <h1 className="mb-8 text-center text-xl text-[#262626]">
                        <BrandWordmark />
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-3">
                        {apiError && (
                            <div
                                className="rounded border border-[#ffccc7] bg-[#fff2f0] px-3 py-2 text-center text-sm text-[#cf1322]"
                                role="alert"
                            >
                                {apiError}
                            </div>
                        )}

                        <input
                            className="w-full rounded border border-[#dbdbdb] bg-[#fafafa] px-2 py-2 text-xs text-[#262626] placeholder:text-[#8e8e8e] focus:border-[var(--brand-e)] focus:bg-white focus:outline-none"
                            placeholder="Email"
                            autoComplete="email"
                            onChange={(e) =>
                                setForm({ ...form, email: e.target.value })
                            }
                        />

                        <input
                            type="password"
                            className="w-full rounded border border-[#dbdbdb] bg-[#fafafa] px-2 py-2 text-xs text-[#262626] placeholder:text-[#8e8e8e] focus:border-[var(--brand-e)] focus:bg-white focus:outline-none"
                            placeholder="Password"
                            autoComplete="current-password"
                            onChange={(e) =>
                                setForm({ ...form, password: e.target.value })
                            }
                        />

                        <button
                            type="submit"
                            className="mt-2 w-full rounded-lg bg-[var(--brand-e)] py-1.5 text-sm font-semibold text-white hover:bg-[var(--brand-e-dark)] active:opacity-90"
                        >
                            Log in
                        </button>
                    </form>
                </div>

                <div className="border border-[#dbdbdb] bg-white px-6 py-4 text-center text-sm sm:rounded-sm">
                    <span className="text-[#262626]">Don&apos;t have an account? </span>
                    <Link to="/register" className="font-semibold text-[var(--brand-e)] hover:text-[var(--brand-e-dark)]">
                        Sign up
                    </Link>
                </div>

                <p className="text-center text-xs text-[#737373]">
                    <Link to="/forgot-password" className="text-[#262626] hover:text-[#737373]">
                        Forgot password?
                    </Link>
                </p>

                <p className="text-center text-xs">
                    <Link to="/welcome" className="font-medium text-[var(--brand-e)] hover:text-[var(--brand-e-dark)]">
                        What is ePatri?
                    </Link>
                </p>
            </div>
        </div>
    );
}