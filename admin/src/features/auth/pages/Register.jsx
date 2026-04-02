import { useState } from "react";
import { registerApi } from "../auth.api";
import { useNavigate } from "react-router-dom";

export default function Register() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        email: "",
        password: "",
        shop_name: "",
        shop_username: "",
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        await registerApi(form);
        navigate("/login");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <form className="bg-white p-6 rounded-xl shadow w-96 space-y-4" onSubmit={handleSubmit}>
                <h2 className="text-xl font-semibold">Create account</h2>

                <input
                    className="w-full border p-2 rounded"
                    placeholder="Shop Name"
                    onChange={(e) =>
                        setForm({ ...form, shop_name: e.target.value })
                    }
                />

                <input
                    className="w-full border p-2 rounded"
                    placeholder="Username"
                    onChange={(e) =>
                        setForm({ ...form, shop_username: e.target.value })
                    }
                />

                <input
                    className="w-full border p-2 rounded"
                    placeholder="Email"
                    onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                    }
                />

                <input
                    type="password"
                    className="w-full border p-2 rounded"
                    placeholder="Password"
                    onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                    }
                />

                <button className="w-full bg-black text-white p-2 rounded">
                    Register
                </button>
            </form>
        </div>
    );
}