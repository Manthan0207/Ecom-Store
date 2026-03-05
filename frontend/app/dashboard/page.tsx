"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, Variants } from "framer-motion";
import { User, Mail, Hash, LogOut, ShoppingBag, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL;

type Me = {
  id: string;
  name: string;
  email: string;
};

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-black/10 border-t-black" />
          <p className="text-sm text-muted-foreground">Loading your profile...</p>
        </motion.div>
      </div>
    );
  }

  if (error && !me) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="font-serif text-4xl">Access Required</h1>
          <p className="mt-3 text-muted-foreground">Please sign in to view your profile.</p>
          <Link href="/login" className="premium-btn mt-6 inline-flex group">
            Sign In
            <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 lg:py-20">
      <motion.div variants={container} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={item} className="mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground mb-3">
            My Account
          </p>
          <h1 className="font-serif text-5xl tracking-tight">
            Welcome, <span className="italic text-black/40">{me?.name?.split(" ")[0]}.</span>
          </h1>
        </motion.div>

        {/* Profile Card */}
        <motion.div variants={item} className="glass-dark rounded-[2rem] p-8 shadow-2xl sm:p-10 mb-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black text-white text-2xl font-bold">
              {me?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">{me?.name}</h2>
              <p className="text-sm text-muted-foreground">Authenticated Member</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white/80 border border-black/5 p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <User size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Name</span>
              </div>
              <p className="font-medium">{me?.name}</p>
            </div>
            <div className="rounded-xl bg-white/80 border border-black/5 p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Mail size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Email</span>
              </div>
              <p className="font-medium text-sm break-all">{me?.email}</p>
            </div>
            <div className="rounded-xl bg-white/80 border border-black/5 p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Hash size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">User ID</span>
              </div>
              <p className="font-mono text-xs break-all text-muted-foreground">{me?.id}</p>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 mb-8">
          <Link
            href="/products"
            className="group flex items-center gap-4 rounded-2xl border border-black/5 p-6 transition-all hover:bg-black/5 hover:border-black/10"
          >
            <div className="rounded-xl bg-black p-3 text-white">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 className="font-bold tracking-tight">Browse Collection</h3>
              <p className="text-sm text-muted-foreground">Explore our curated selection</p>
            </div>
            <ArrowRight size={16} className="ml-auto text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="/cart"
            className="group flex items-center gap-4 rounded-2xl border border-black/5 p-6 transition-all hover:bg-black/5 hover:border-black/10"
          >
            <div className="rounded-xl bg-black p-3 text-white">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 className="font-bold tracking-tight">Shopping Bag</h3>
              <p className="text-sm text-muted-foreground">View your current items</p>
            </div>
            <ArrowRight size={16} className="ml-auto text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        {/* Security Badge + Logout */}
        <motion.div variants={item} className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">
              Session secured with 2FA + HttpOnly cookies
            </span>
          </div>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-100 active:scale-95"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
