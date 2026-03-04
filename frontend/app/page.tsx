import Link from "next/link";

export default function HomePage() {
  return (
    <section className="grid items-end gap-8 py-8 md:grid-cols-[1.2fr_0.8fr] md:py-14">
      <div className="space-y-6">
        <p className="text-[11px] uppercase tracking-[0.26em] text-black/60">Enterprise auth for retail stores</p>
        <h1 className="font-editorial text-5xl leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
          Built to look luxury.
          <br />
          Engineered to lock down access.
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-black/70">
          A modern cookie-based authentication flow for ecommerce storefront platforms with mandatory email OTP,
          backend validation, and route-level access control.
        </p>
        <div className="flex flex-wrap gap-3 pt-3">
          <Link className="btn-primary" href="/signup">
            Create Account
          </Link>
          <Link className="btn-ghost" href="/login">
            Sign In
          </Link>
        </div>
      </div>
      <div className="border border-black bg-white p-6 shadow-[10px_10px_0_0_rgba(0,0,0,0.9)] sm:p-8">
        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-[0.24em] text-black/55">Authentication sequence</p>
          <div className="space-y-3 text-sm text-black/80">
            <div className="border-l-2 border-black pl-3">1. Email + password check</div>
            <div className="border-l-2 border-black pl-3">2. SMTP OTP delivery</div>
            <div className="border-l-2 border-black pl-3">3. OTP validation from database</div>
            <div className="border-l-2 border-black pl-3">4. 7-day HttpOnly session cookie</div>
          </div>
        </div>
      </div>
    </section>
  );
}
