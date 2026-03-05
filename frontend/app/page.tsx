"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { ArrowRight, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";

const heroSlides = [
  {
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&h=800&fit=crop",
    subtitle: "New Season",
    title: "The Art of\nTimeless Craft.",
    cta: "Explore Collection",
  },
  {
    image: "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?w=1400&h=800&fit=crop",
    subtitle: "Limited Edition",
    title: "Refined\nElegance.",
    cta: "Shop Now",
  },
  {
    image: "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=1400&h=800&fit=crop",
    subtitle: "Curated Selection",
    title: "Beyond\nOrdinary.",
    cta: "Discover More",
  },
  {
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1400&h=800&fit=crop",
    subtitle: "Handcrafted",
    title: "Where Luxury\nMeets Legacy.",
    cta: "View All",
  },
];

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function HomePage() {
  const [current, setCurrent] = useState(0);

  // Auto-advance every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (index: number) => {
    setCurrent((index + heroSlides.length) % heroSlides.length);
  };

  return (
    <div>
      {/* Hero Carousel */}
      <section className="relative h-[85vh] min-h-[600px] overflow-hidden bg-black">
        {/* Background images with crossfade */}
        <AnimatePresence mode="sync">
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={heroSlides[current].image}
              alt={heroSlides[current].title}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
          </motion.div>
        </AnimatePresence>

        {/* Content overlay */}
        <div className="relative z-10 flex h-full items-end pb-20 lg:items-center lg:pb-0">
          <div className="mx-auto w-full max-w-7xl px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-2xl"
              >
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.4em] text-white/50">
                  {heroSlides[current].subtitle}
                </p>
                <h1 className="font-serif text-5xl leading-[1.05] text-white sm:text-7xl lg:text-8xl whitespace-pre-line">
                  {heroSlides[current].title}
                </h1>
                <div className="mt-8 flex gap-4">
                  <Link
                    href="/products"
                    className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-black transition-all duration-300 hover:bg-white/90 active:scale-95"
                  >
                    {heroSlides[current].cta}
                    <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-4 text-sm font-medium text-white/80 transition-all duration-300 hover:bg-white/10 hover:text-white"
                  >
                    Sign In
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Slide indicators + navigation */}
            <div className="mt-12 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goTo(current - 1)}
                  className="rounded-full border border-white/20 p-2 text-white/40 transition-all duration-300 hover:bg-white/10 hover:text-white"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => goTo(current + 1)}
                  className="rounded-full border border-white/20 p-2 text-white/40 transition-all duration-300 hover:bg-white/10 hover:text-white"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {heroSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className="group relative h-1 overflow-hidden rounded-full transition-all duration-500"
                    style={{ width: i === current ? 48 : 16 }}
                  >
                    <div className="absolute inset-0 rounded-full bg-white/20" />
                    {i === current && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 5, ease: "linear" }}
                        className="absolute inset-0 origin-left rounded-full bg-white"
                      />
                    )}
                  </button>
                ))}
              </div>

              <span className="text-xs font-medium text-white/30">
                {String(current + 1).padStart(2, "0")} / {String(heroSlides.length).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bar */}
      <motion.section
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="border-b border-black/5 bg-white"
      >
        <div className="mx-auto grid max-w-7xl gap-0 sm:grid-cols-3">
          {[
            { title: "Free Shipping", desc: "On all orders over $500" },
            { title: "Secure Checkout", desc: "2FA + encrypted sessions" },
            { title: "30-Day Returns", desc: "No questions asked" },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              variants={item}
              className={`flex items-center justify-center gap-3 px-8 py-6 text-center ${
                i < 2 ? "sm:border-r sm:border-black/5" : ""
              }`}
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-widest">{f.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Featured Products Section */}
      <motion.section
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="mx-auto max-w-7xl px-6 py-20"
      >
        <motion.div variants={item} className="mb-12 flex items-end justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
              Featured
            </p>
            <h2 className="font-serif text-4xl tracking-tight sm:text-5xl">
              Editor&apos;s <span className="italic text-black/40">Picks</span>
            </h2>
          </div>
          <Link
            href="/products"
            className="group hidden items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-black sm:flex"
          >
            View All
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600&h=700&fit=crop",
              category: "Watches",
              name: "Chronograph Noir",
              price: "$4,250",
            },
            {
              image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=700&fit=crop",
              category: "Bags",
              name: "Maison Tote",
              price: "$2,850",
            },
            {
              image: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600&h=700&fit=crop",
              category: "Shoes",
              name: "Artisan Oxford",
              price: "$1,250",
            },
          ].map((p) => (
            <motion.div key={p.name} variants={item}>
              <Link href="/products" className="group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </div>
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{p.category}</p>
                  <h3 className="mt-1 text-lg font-bold tracking-tight">{p.name}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{p.price}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 text-center sm:hidden">
          <Link href="/products" className="premium-btn group inline-flex">
            View All Products
            <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </motion.section>

      {/* Brand Statement */}
      <section className="bg-black py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-4xl px-6 text-center"
        >
          <ShieldCheck size={24} className="mx-auto mb-6 text-white/30" />
          <h2 className="font-serif text-3xl leading-relaxed text-white sm:text-5xl">
            Where <span className="italic text-white/40">security</span> meets{" "}
            <span className="italic text-white/40">sophistication.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-white/40">
            Every interaction is protected by our multi-factor identity layer.
            Enterprise-grade encryption, mandatory OTP verification, and
            hardware-secured session management — built for luxury commerce.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-full bg-white px-8 py-3.5 text-sm font-bold text-black transition-all duration-300 hover:bg-white/90 active:scale-95"
            >
              Create Account
            </Link>
            <Link
              href="/products"
              className="rounded-full border border-white/20 px-8 py-3.5 text-sm font-medium text-white/60 transition-all duration-300 hover:bg-white/10 hover:text-white"
            >
              Browse Collection
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
