"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Verify2FAPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/api/auth/verify-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-xl py-6 sm:py-10">
      <div className="border border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.9)] sm:p-8">
        <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-black/55">Security verification</p>
        <h1 className="font-editorial text-4xl leading-none sm:text-5xl">Enter OTP</h1>
        <p className="mt-3 text-sm text-black/70">Step 2: provide the 6-digit code sent to your email address.</p>

        {error ? (
          <div className="mt-5 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="block text-[11px] uppercase tracking-[0.2em] text-black/65">Email OTP Code</label>
            <input
              className="field text-center text-lg tracking-[0.4em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
              required
            />
          </div>

          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify and Login"}
          </button>
        </form>
      </div>
    </section>
  );
}
