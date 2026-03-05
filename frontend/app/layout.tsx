import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import "./globals.css";
import LoadingProgress from "@/components/LoadingProgress";
import { CartProvider } from "@/lib/cart-context";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "STORE OS | Luxury Commerce",
  description: "Curated luxury goods with enterprise-grade secure authentication",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full grain">
        <CartProvider>
          <Suspense fallback={null}>
            <LoadingProgress />
          </Suspense>

          <div className="flex min-h-screen flex-col">
            <Navbar />

            <main className="flex-grow">
              {children}
            </main>

            <footer className="border-t border-black/5 py-16">
              <div className="mx-auto max-w-7xl px-6">
                <div className="grid gap-12 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles size={18} />
                      <span className="font-serif text-lg font-bold">STORE OS</span>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      A curated selection of luxury goods backed by enterprise-grade security. Every transaction is protected by our multi-factor identity layer.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-4">Shop</p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li><Link href="/products" className="hover:text-black transition-colors">All Products</Link></li>
                      <li><Link href="/products" className="hover:text-black transition-colors">New Arrivals</Link></li>
                      <li><Link href="/products" className="hover:text-black transition-colors">Best Sellers</Link></li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-4">Account</p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li><Link href="/profile" className="hover:text-black transition-colors">My Profile</Link></li>
                      <li><Link href="/cart" className="hover:text-black transition-colors">Shopping Bag</Link></li>
                      <li><Link href="/login" className="hover:text-black transition-colors">Sign In</Link></li>
                    </ul>
                  </div>
                </div>
                <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-black/5 pt-8 sm:flex-row">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-black/40" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">
                      Secure Commerce Identity Layer
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    &copy; {new Date().getFullYear()} STORE OS. Built for luxury commerce.
                  </p>
                </div>
              </div>
            </footer>
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
