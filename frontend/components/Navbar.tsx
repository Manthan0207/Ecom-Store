"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ShoppingBag, User, Menu, LogOut } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

type Me = {
  id: string;
  name: string;
  email: string;
};

export default function Navbar() {
  const [expanded, setExpanded] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const [meRes, roleRes] = await Promise.all([
          fetch(`${API}/api/me`, { credentials: "include" }),
          fetch(`${API}/api/auth/role`, { credentials: "include" }),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setMe(meData);
        } else {
          setMe(null);
        }

        if (roleRes.ok) {
          const roleData = await roleRes.json();
          setRole(roleData.role ?? null);
        } else {
          setRole(null);
        }
      } catch {
        setMe(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const onLogout = async () => {
    await fetch(`${API}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setMe(null);
    setRole(null);
    window.location.href = "/login";
  };

  const isAuthed = Boolean(me);
  const isSeller = role === "seller";
  const brandHref = isSeller ? "/dashboard/seller" : "/";

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
      <motion.nav
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        layout
        className="relative flex items-center rounded-2xl bg-black/95 backdrop-blur-xl shadow-2xl shadow-black/25 border border-white/5"
        style={{ minHeight: 56 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Brand - always visible */}
        <Link href={brandHref} className="flex items-center gap-2.5 px-6 py-4 group">
          <Sparkles size={18} className="text-white/60 transition-colors duration-500 group-hover:text-white" />
          <span className="font-serif text-base font-bold tracking-tight text-white whitespace-nowrap">
            STORE OS
          </span>
        </Link>

        {/* Expandable nav items */}
        <AnimatePresence mode="wait">
          {expanded && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center overflow-hidden"
            >
              <div className="mx-1 h-6 w-px bg-white/10" />

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              className="flex items-center gap-1 px-2"
            >
              {isSeller ? (
                <>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white/50 transition-all duration-300 hover:bg-white/10 hover:text-white"
                  >
                    <User size={15} />
                    <span className="whitespace-nowrap">Profile</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/products"
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white/50 transition-all duration-300 hover:bg-white/10 hover:text-white"
                  >
                    <ShoppingBag size={15} />
                    <span className="whitespace-nowrap">Shop</span>
                  </Link>

                  <Link
                    href="/cart"
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white/50 transition-all duration-300 hover:bg-white/10 hover:text-white"
                  >
                    <ShoppingBag size={15} />
                    <span className="whitespace-nowrap">Bag</span>
                  </Link>

                  {isAuthed ? (
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white/50 transition-all duration-300 hover:bg-white/10 hover:text-white"
                    >
                      <User size={15} />
                      <span className="whitespace-nowrap">Dashboard</span>
                    </Link>
                  ) : (
                    <Link
                      href="/login"
                      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white/50 transition-all duration-300 hover:bg-white/10 hover:text-white"
                    >
                      <User size={15} />
                      <span className="whitespace-nowrap">Sign In</span>
                    </Link>
                  )}
                </>
              )}
            </motion.div>

            <div className="mx-1 h-6 w-px bg-white/10" />

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="pr-3"
            >
              {!loading && !isAuthed ? (
                <Link
                  href="/signup"
                  className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black transition-all duration-300 hover:bg-white/90 active:scale-95 whitespace-nowrap inline-block"
                >
                  Get Started
                </Link>
              ) : isAuthed ? (
                <button
                  onClick={onLogout}
                  className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black transition-all duration-300 hover:bg-white/90 active:scale-95 whitespace-nowrap inline-flex items-center gap-2"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* Collapsed indicator dots */}
        <AnimatePresence>
          {!expanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-1 pr-5 pl-1"
            >
              <Menu size={16} className="text-white/25" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
}
