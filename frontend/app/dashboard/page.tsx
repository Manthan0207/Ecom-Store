"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL;

type Me = {
  id: string;
  name: string;
  email: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`${API}/api/me`, {
          credentials: "include",
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Unauthorized");
          router.push("/login");
          return;
        }

        setMe(data);
      } catch {
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [router]);

  const onLogout = async () => {
    await fetch(`${API}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl border border-black bg-white p-6 text-sm uppercase tracking-[0.2em] shadow-[8px_8px_0_0_rgba(0,0,0,0.9)]">
        Loading dashboard...
      </div>
    );
  }

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-5 py-4 sm:py-8">
      {error ? (
        <div className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      <div className="border border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.9)] sm:p-8">
        <div className="mb-3 inline-flex border border-black bg-black px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white">
          Authenticated
        </div>
        <h1 className="font-editorial text-4xl leading-none sm:text-5xl">Dashboard</h1>
        <p className="mt-3 max-w-xl text-sm text-black/70">
          You are signed in with cookie-based authentication and mandatory email OTP verification.
        </p>

        {me ? (
          <div className="mt-7 grid gap-3 text-sm sm:grid-cols-3">
            <div className="border border-black/15 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-black/55">Name</p>
              <p className="mt-1 break-all text-base text-black">{me.name}</p>
            </div>
            <div className="border border-black/15 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-black/55">Email</p>
              <p className="mt-1 break-all text-base text-black">{me.email}</p>
            </div>
            <div className="border border-black/15 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-black/55">User ID</p>
              <p className="mt-1 break-all text-xs text-black">{me.id}</p>
            </div>
          </div>
        ) : null}

        <button className="btn-primary mt-7" onClick={onLogout}>
          Logout
        </button>
      </div>
    </section>
  );
}
