"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldAlert, User } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type RoleResponse = {
  user_id: string;
  role: string;
};

type GuardState = {
  status: "loading" | "allowed" | "denied";
  message?: string;
};

export default function SellerLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [guard, setGuard] = useState<GuardState>({ status: "loading" });

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`${API}/api/auth/role`, {
          credentials: "include",
        });
        const data: RoleResponse = await res.json();

        if (!res.ok || data.role !== "seller") {
          setGuard({
            status: "denied",
            message: "Seller access required. Please sign in with a seller account.",
          });
          return;
        }

        setGuard({ status: "allowed" });
      } catch {
        setGuard({
          status: "denied",
          message: "Unable to verify seller role. Please try again.",
        });
      }
    };

    void run();
  }, []);

  if (guard.status === "loading") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-black/10 border-t-black" />
          <p className="text-sm text-muted-foreground">Checking seller access...</p>
        </motion.div>
      </div>
    );
  }

  if (guard.status === "denied") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg text-center"
        >
          <div className="mx-auto mb-5 inline-flex items-center justify-center rounded-2xl bg-red-500/10 p-4 text-red-600">
            <ShieldAlert size={28} />
          </div>
          <h1 className="font-serif text-4xl">Access Restricted</h1>
          <p className="mt-3 text-muted-foreground">{guard.message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="premium-btn">
              Sign In
            </Link>
            <button
              onClick={() => router.push("/dashboard")}
              className="premium-btn-outline"
            >
              Back to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <aside className="glass-dark rounded-[2rem] p-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">
                <User size={18} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
                  Seller Studio
                </p>
                <p className="text-lg font-bold">Manage Catalog</p>
              </div>
            </div>
            <Link
              href="/dashboard/seller"
              className="rounded-full border border-black/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground"
            >
              Studio Home
            </Link>
          </div>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
