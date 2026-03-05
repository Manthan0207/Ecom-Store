"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, Variants } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  User, Mail, Hash, LogOut, ShoppingBag, ShieldCheck,
  ArrowRight, Package, Heart, Settings, ChevronRight
} from "lucide-react";

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
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`${API}/api/me`, { credentials: "include" });
        const data = await res.json();
        if (!res.ok) {
          router.push("/login");
          return;
        }
        setMe(data);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [router]);

  const onLogout = async () => {
    await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-black/10 border-t-black" />
      </div>
    );
  }

  if (!me) return null;

  const initials = me.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="mx-auto max-w-5xl px-6 pt-28 pb-16">
      <motion.div variants={container} initial="hidden" animate="show">
        {/* Profile Header */}
        <motion.div variants={item} className="flex flex-col items-center text-center mb-12">
          <div className="relative mb-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-black text-3xl font-bold text-white shadow-2xl shadow-black/20">
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-400 border-4 border-white shadow-sm" />
          </div>
          <h1 className="font-serif text-4xl tracking-tight">{me.name}</h1>
          <p className="mt-2 text-muted-foreground">{me.email}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1">
            <ShieldCheck size={12} className="text-green-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/50">Verified Member</span>
          </div>
        </motion.div>

        {/* Stats Row */}
        <motion.div variants={item} className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: "Bag Items", value: "—", icon: ShoppingBag },
            { label: "Wishlist", value: "—", icon: Heart },
            { label: "Orders", value: "0", icon: Package },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-black/5 bg-white p-5 text-center transition-all hover:border-black/10 hover:shadow-sm">
              <stat.icon size={18} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Account Info Card */}
        <motion.div variants={item} className="glass-dark rounded-[2rem] p-8 shadow-xl mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-6">Account Details</h2>
          <div className="space-y-5">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-black/5 p-2"><User size={16} className="text-black/50" /></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Full Name</p>
                  <p className="text-sm font-medium mt-0.5">{me.name}</p>
                </div>
              </div>
            </div>
            <div className="h-px bg-black/5" />
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-black/5 p-2"><Mail size={16} className="text-black/50" /></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email Address</p>
                  <p className="text-sm font-medium mt-0.5">{me.email}</p>
                </div>
              </div>
            </div>
            <div className="h-px bg-black/5" />
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-black/5 p-2"><Hash size={16} className="text-black/50" /></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">User ID</p>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5 break-all">{me.id}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div variants={item} className="space-y-3 mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-black/40 mb-4">Quick Links</h2>
          {[
            { href: "/products", icon: ShoppingBag, label: "Browse Collection", desc: "Explore curated luxury items" },
            { href: "/cart", icon: Package, label: "Shopping Bag", desc: "View your current selection" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center gap-4 rounded-2xl border border-black/5 p-5 transition-all hover:bg-black hover:text-white"
            >
              <div className="rounded-xl bg-black/5 p-3 transition-colors group-hover:bg-white/10">
                <link.icon size={18} className="transition-colors group-hover:text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold tracking-tight">{link.label}</h3>
                <p className="text-xs text-muted-foreground transition-colors group-hover:text-white/60">{link.desc}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground transition-all group-hover:text-white group-hover:translate-x-1" />
            </Link>
          ))}
        </motion.div>

        {/* Security + Logout */}
        <motion.div variants={item} className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-black/5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-muted-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              2FA + HttpOnly Session Active
            </span>
          </div>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-100 active:scale-95"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
