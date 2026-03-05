"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, Variants } from "framer-motion";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { products, categories, getProductsByCategory } from "@/lib/products";
import { useCart } from "@/lib/cart-context";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.2 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function ProductsPage() {
  const [active, setActive] = useState("All");
  const filtered = getProductsByCategory(active);
  const { addItem } = useCart();

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:py-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12 text-center"
      >
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
          Curated Collection
        </p>
        <h1 className="font-serif text-5xl tracking-tight sm:text-6xl">
          The <span className="italic text-black/40">Edit</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Meticulously selected pieces for the discerning individual. Each item represents the pinnacle of craft and design.
        </p>
      </motion.div>

      {/* Category Filter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mb-12 flex flex-wrap justify-center gap-2"
      >
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={`rounded-full px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
              active === cat
                ? "bg-black text-white scale-105"
                : "bg-black/5 text-black/50 hover:bg-black/10 hover:text-black"
            }`}
          >
            {cat}
          </button>
        ))}
      </motion.div>

      {/* Product Grid */}
      <motion.div
        key={active}
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
      >
        {filtered.map((product) => (
          <motion.div
            key={product.id}
            variants={item}
            className="group relative"
          >
            <div className="overflow-hidden rounded-2xl bg-muted">
              <Link href={`/products/${product.id}`}>
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  {product.badge && (
                    <span className="absolute left-4 top-4 rounded-full bg-black px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                      {product.badge}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
                </div>
              </Link>
            </div>

            <div className="mt-4 flex items-start justify-between">
              <Link href={`/products/${product.id}`} className="flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {product.category}
                </p>
                <h3 className="mt-1 text-lg font-bold tracking-tight transition-colors group-hover:text-black/70">
                  {product.name}
                </h3>
                <p className="mt-1 text-sm font-medium text-black/60">
                  ${product.price.toLocaleString()}
                </p>
              </Link>
              <button
                onClick={() => addItem(product)}
                className="mt-1 rounded-xl bg-black p-2.5 text-white transition-all hover:scale-110 hover:bg-black/80 active:scale-95"
                title="Add to cart"
              >
                <ShoppingBag size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
