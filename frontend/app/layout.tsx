import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ecom Store Auth",
  description: "Cookie auth + mandatory 2FA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-atelier grain-overlay">
          <nav className="sticky top-0 z-20 border-b border-black/10 bg-white/80 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
              <Link className="font-editorial text-xl tracking-[0.3em]" href="/">
                STORE OS
              </Link>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] sm:gap-5">
                <Link className="border border-transparent px-2 py-1 hover:border-black/20" href="/signup">
                  Signup
                </Link>
                <Link className="border border-transparent px-2 py-1 hover:border-black/20" href="/login">
                  Login
                </Link>
                <Link className="border border-transparent px-2 py-1 hover:border-black/20" href="/dashboard">
                  Dashboard
                </Link>
              </div>
            </div>
          </nav>
          <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
            {children}
          </main>
          <div className="border-t border-black/10 px-4 py-5 text-center text-[10px] uppercase tracking-[0.24em] text-black/55 sm:px-6">
            Secure Commerce Identity Layer
          </div>
        </div>
      </body>
    </html>
  );
}
