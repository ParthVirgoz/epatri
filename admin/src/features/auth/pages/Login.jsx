import { useState } from "react";
import { loginApi } from "../auth.api";
import { useAuthStore } from "../auth.store";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuthStore();

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
        navigate("/dashboard");
    };

    return (
        <div className="min-h-screen flex">
            {/* Left */}
            <div className="hidden md:flex w-1/2 bg-black text-white items-center justify-center">
                <h1 className="text-4xl font-bold">ePatri Admin</h1>
            </div>

            {/* Right */}
            <div className="flex flex-col justify-center w-full md:w-1/2 p-8">
                <form
                    onSubmit={handleSubmit}
                    className="max-w-md w-full mx-auto space-y-6"
                >
                    <h2 className="text-2xl font-semibold">Welcome back</h2>

                    {apiError && (
                        <div className="text-red-600 bg-red-100 p-2 rounded-md mb-2" role="alert">
                            {apiError}
                        </div>
                    )}

                    <input
                        className="w-full border p-3 rounded-xl"
                        placeholder="Email"
                        onChange={(e) =>
                            setForm({ ...form, email: e.target.value })
                        }
                    />

                    <input
                        type="password"
                        className="w-full border p-3 rounded-xl"
                        placeholder="Password"
                        onChange={(e) =>
                            setForm({ ...form, password: e.target.value })
                        }
                    />

                    <button className="w-full bg-black text-white p-3 rounded-xl">
                        Sign in
                    </button>

                    <div className="flex justify-between text-sm">
                        <Link to="/register">Create account</Link>
                        <Link to="/forgot-password">Forgot password?</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}