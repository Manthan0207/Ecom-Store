"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { ShieldCheck, ArrowRight, Mail, Lock, Loader2, Key } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

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
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6 py-12">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid w-full max-w-5xl gap-12 lg:grid-cols-2 lg:items-center"
      >
        {/* Left Side: Branding/Content */}
        <div className="hidden space-y-8 lg:block">
          <motion.div variants={itemVariants} className="space-y-4">
            <h1 className="text-balance font-serif text-6xl tracking-tight">
              Welcome <br />
              <span className="italic text-black/40">back.</span>
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Continue your secure commerce experience with our multi-layered identity protection.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-6">
            <FeatureItem 
              icon={<Key size={20} />}
              title="Identity Guard"
              desc="Hardware-encrypted session management"
            />
            <FeatureItem 
              icon={<ShieldCheck size={20} />}
              title="Secure Access"
              desc="Mandatory multi-factor sequence validation"
            />
          </motion.div>
        </div>

        {/* Right Side: Form */}
        <motion.div variants={itemVariants}>
          <div className="glass-dark rounded-[2rem] p-8 shadow-2xl sm:p-12">
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight">Sign In</h2>
              <p className="mt-2 text-sm text-muted-foreground">Enter your credentials to continue.</p>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 rounded-xl bg-red-500/10 p-4 text-sm text-red-600 border border-red-500/20"
              >
                {error}
              </motion.div>
            )}

            <form className="space-y-6" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-black/40">Email Address</label>
                <div className="relative">
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-black/20 pointer-events-none" size={18} />
                  <input
                    className="premium-input pr-12"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-black/40">Password</label>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-black/20 pointer-events-none" size={18} />
                  <input
                    className="premium-input pr-12"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button className="premium-btn w-full group" type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 transition-transform group-hover:translate-x-1" size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link className="font-bold text-black hover:underline" href="/signup">
                Sign Up
              </Link>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="rounded-xl bg-black px-3 py-3 text-white">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-bold tracking-tight">{title}</h3>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
