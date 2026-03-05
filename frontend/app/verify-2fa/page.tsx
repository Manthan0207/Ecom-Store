"use client";

import { FormEvent, useState, useRef, KeyboardEvent, ClipboardEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, Variants } from "framer-motion";
import { ShieldCheck, ArrowRight, Loader2, Key } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;
const OTP_LENGTH = 6;

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

export default function Verify2FAPage() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join("");

  const focusInput = (index: number) => {
    if (index >= 0 && index < OTP_LENGTH) {
      inputRefs.current[index]?.focus();
    }
  };

  const handleChange = (index: number, value: string) => {
    // Only allow single digit
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Auto-advance to next box
    if (digit && index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // If current box is empty, go back and clear previous
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        setDigits(newDigits);
        focusInput(index - 1);
      } else {
        // Clear current box
        const newDigits = [...digits];
        newDigits[index] = "";
        setDigits(newDigits);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusInput(index - 1);
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (pasted) {
      const newDigits = Array(OTP_LENGTH).fill("");
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setDigits(newDigits);
      focusInput(Math.min(pasted.length, OTP_LENGTH - 1));
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== OTP_LENGTH) return;
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
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6 py-12">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full max-w-lg"
      >
        <div className="glass-dark rounded-[2rem] p-8 shadow-2xl sm:p-12">
          <motion.div variants={itemVariants} className="mb-8 text-center">
            <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-2xl bg-black p-4 text-white">
              <Key size={32} />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Verify Identity</h2>
            <p className="mt-2 text-sm text-muted-foreground">Enter the 6-digit code sent to your email.</p>
          </motion.div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 rounded-xl bg-red-500/10 p-4 text-sm text-red-600 border border-red-500/20 text-center"
            >
              {error}
            </motion.div>
          )}

          <form className="space-y-8" onSubmit={onSubmit}>
            <motion.div variants={itemVariants}>
              <div className="flex justify-center gap-3">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    onFocus={(e) => e.target.select()}
                    autoFocus={index === 0}
                    className="h-16 w-12 sm:h-[72px] sm:w-14 rounded-xl border-2 border-black/10 bg-white 
                      text-center text-2xl font-bold outline-none transition-all duration-200
                      focus:border-black focus:bg-black/5 focus:ring-4 focus:ring-black/10 focus:scale-110
                      placeholder:text-black/10"
                    placeholder="·"
                  />
                ))}
              </div>
            </motion.div>

            <motion.button 
              variants={itemVariants}
              className="premium-btn w-full group" 
              type="submit" 
              disabled={loading || code.length !== OTP_LENGTH}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  Verify and Continue
                  <ArrowRight className="ml-2 transition-transform group-hover:translate-x-1" size={16} />
                </>
              )}
            </motion.button>
          </form>

          <motion.div variants={itemVariants} className="mt-8 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <ShieldCheck size={14} />
              Secure multi-factor sequence active
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
