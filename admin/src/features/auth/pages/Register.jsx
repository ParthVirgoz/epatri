import { useState } from "react";
import { registerApi } from "../auth.api";
import { useNavigate, Link } from "react-router-dom";
import BrandWordmark from "../../../components/BrandWordmark";

export default function Register() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        email: "",
        password: "",
        shop_name: "",
        shop_username: "",
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        const [, err] = await registerApi(form);
        setLoading(false);
        if (err) {
            setError(err);
            return;
        }
        navigate("/login");
    };

    return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--app-bg)] px-4 py-10">
            <div className="w-full max-w-[350px] space-y-6">
                <div className="border border-[#dbdbdb] bg-white px-8 py-10 sm:rounded-sm">
                    <h1 className="mb-2 text-center text-xl text-[#262626]">
                        <BrandWordmark />
                    </h1>
                    <p className="mb-6 text-center text-sm font-semibold text-[#8e8e8e]">
                        Create your place
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-3">
                        {error && (
                            <div className="rounded border border-[#ffccc7] bg-[#fff2f0] px-3 py-2 text-center text-sm text-[#cf1322]">
                                {error}
                            </div>
                        )}

                        <input
                            className="w-full rounded border border-[#dbdbdb] bg-[#fafafa] px-2 py-2 text-xs text-[#262626] placeholder:text-[#8e8e8e] focus:border-[var(--brand-e)] focus:bg-white focus:outline-none"
                            placeholder="Place name"
                            onChange={(e) =>
                                setForm({ ...form, shop_name: e.target.value })
                            }
                        />
                        <input
                            className="w-full rounded border border-[#dbdbdb] bg-[#fafafa] px-2 py-2 text-xs text-[#262626] placeholder:text-[#8e8e8e] focus:border-[var(--brand-e)] focus:bg-white focus:outline-none"
                            placeholder="Username"
                            autoComplete="username"
                            onChange={(e) =>
                                setForm({ ...form, shop_username: e.target.value })
                            }
                        />
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
                            autoComplete="new-password"
                            onChange={(e) =>
                                setForm({ ...form, password: e.target.value })
                            }
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-2 w-full rounded-lg bg-[var(--brand-e)] py-1.5 text-sm font-semibold text-white hover:bg-[var(--brand-e-dark)] disabled:opacity-50"
                        >
                            {loading ? "Creating…" : "Sign up"}
                        </button>
                    </form>
                </div>

                <div className="border border-[#dbdbdb] bg-white px-6 py-4 text-center text-sm sm:rounded-sm">
                    <span className="text-[#262626]">Have an account? </span>
                    <Link to="/login" className="font-semibold text-[var(--brand-e)] hover:text-[var(--brand-e-dark)]">
                        Log in
                    </Link>
                </div>

                <p className="text-center text-xs">
                    <Link to="/welcome" className="font-medium text-[var(--brand-e)] hover:text-[var(--brand-e-dark)]">
                        Why ePatri?
                    </Link>
                </p>
            </div>
        </div>
    );
}
