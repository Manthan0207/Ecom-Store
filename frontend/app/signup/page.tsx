"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
        return;
      }

      setSuccess(data.message || "Signup successful");
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-xl py-6 sm:py-10">
      <div className="border border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.9)] sm:p-8">
        <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-black/55">Account setup</p>
        <h1 className="font-editorial text-4xl leading-none sm:text-5xl">Create account</h1>
        <p className="mt-3 text-sm text-black/70">Mandatory 2FA is enabled. OTP comes to your email at login.</p>

        {error ? (
          <div className="mt-5 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        {success ? (
          <div className="mt-5 border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="block text-[11px] uppercase tracking-[0.2em] text-black/65">Name</label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-5 text-xs uppercase tracking-[0.18em] text-black/60">
          Already signed up?{" "}
          <Link className="border-b border-black pb-0.5 text-black" href="/login">
            Go to login
          </Link>
        </p>
      </div>
      <div className="mt-6 border border-black/15 bg-white/70 px-5 py-4 text-[11px] uppercase tracking-[0.2em] text-black/55">
        Retail-ready style direction inspired by luxury fashion storefronts
      </div>
    </section>
  );
}
