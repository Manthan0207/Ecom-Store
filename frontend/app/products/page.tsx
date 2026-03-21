"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, Variants } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/products";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";
const FALLBACK_IMAGE = "https://placehold.co/900x900/png?text=No+Image";

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

type CatalogListItem = {
  id: string;
  title: string;
  brand: string;
  category: string;
  target_audience: string;
  price_min: number;
  price_max: number;
  image_url: string;
};

export default function ProductsPage() {
  const [active, setActive] = useState("All");
  const [items, setItems] = useState<CatalogListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { addItem } = useCart();

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`${API}/api/products`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load products");
          return;
        }
        setItems(data.items || []);
      } catch {
        setError("Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(items.map((item) => item.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [items]);

  const filtered = useMemo(() => {
    if (active === "All") return items;
    return items.filter((item) => item.category === active);
  }, [active, items]);

  const formatPrice = (product: CatalogListItem) => {
    const min = product.price_min || product.price_max || 0;
    const max = product.price_max || product.price_min || 0;
    if (min === 0 && max === 0) return "Price on request";
    if (min === max) return `$${min.toLocaleString()}`;
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  };

  const toCartProduct = (product: CatalogListItem): Product => {
    const price = product.price_min || product.price_max || 0;
    const details = [
      product.brand ? `Brand: ${product.brand}` : null,
      product.target_audience ? `Audience: ${product.target_audience}` : null,
      product.category ? `Category: ${product.category}` : null,
    ].filter(Boolean) as string[];

    return {
      id: product.id,
      name: product.title,
      price,
      category: product.category || "Catalog",
      description: product.brand ? `${product.brand} product` : "Catalog item",
      details,
      image: product.image_url || FALLBACK_IMAGE,
    };
  };

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
      {categories.length > 1 && (
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
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-black/10 border-t-black" />
          Loading products...
        </div>
      ) : error ? (
        <p className="text-center text-sm text-red-600">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-[2rem] border border-black/5 bg-white/80 p-10 text-center">
          <p className="text-lg font-semibold">No products available</p>
          <p className="mt-2 text-sm text-muted-foreground">Check back soon for new arrivals.</p>
        </div>
      ) : (
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
                      src={product.image_url || FALLBACK_IMAGE}
                      alt={product.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
                  </div>
                </Link>
              </div>

              <div className="mt-4 flex items-start justify-between">
                <Link href={`/products/${product.id}`} className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {product.category || "Catalog"}
                  </p>
                  <h3 className="mt-1 text-lg font-bold tracking-tight transition-colors group-hover:text-black/70">
                    {product.title}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-black/60">
                    {formatPrice(product)}
                  </p>
                </Link>
                <button
                  onClick={() => addItem(toCartProduct(product))}
                  className="mt-1 rounded-xl bg-black p-2.5 text-white transition-all hover:scale-110 hover:bg-black/80 active:scale-95"
                  title="Add to cart"
                >
                  <ShoppingBag size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
