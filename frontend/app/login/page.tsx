"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/verify-2fa");
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-xl py-6 sm:py-10">
      <div className="border border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.9)] sm:p-8">
        <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-black/55">Account access</p>
        <h1 className="font-editorial text-4xl leading-none sm:text-5xl">Sign in</h1>
        <p className="mt-3 text-sm text-black/70">Step 1: verify credentials. Step 2: confirm OTP from email.</p>

        {error ? (
          <div className="mt-5 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="block text-[11px] uppercase tracking-[0.2em] text-black/65">Email</label>
            <input
              className="field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] uppercase tracking-[0.2em] text-black/65">Password</label>
            <input
              className="field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? "Checking..." : "Send OTP"}
          </button>
        </form>

        <p className="mt-5 text-xs uppercase tracking-[0.18em] text-black/60">
          Need an account?{" "}
          <Link className="border-b border-black pb-0.5 text-black" href="/signup">
            Create one
          </Link>
        </p>
      </div>
    </section>
  );
}
