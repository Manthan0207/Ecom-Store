"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, Variants } from "framer-motion";
import { ShoppingBag, ArrowLeft, Check, Star } from "lucide-react";
import { getProduct, products } from "@/lib/products";
import { useCart } from "@/lib/cart-context";
import { useState } from "react";

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const product = getProduct(id);
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  if (!product) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-4xl">Product Not Found</h1>
          <Link href="/products" className="premium-btn mt-6 inline-flex">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const handleAdd = () => {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Back link */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-black"
        >
          <ArrowLeft size={16} />
          Back to Collection
        </Link>
      </motion.div>

      {/* Product Hero */}
      <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
        {/* Image */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="overflow-hidden rounded-3xl bg-muted"
        >
          <div className="relative aspect-square">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            {product.badge && (
              <span className="absolute left-6 top-6 rounded-full bg-black px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white">
                {product.badge}
              </span>
            )}
          </div>
        </motion.div>

        {/* Details */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-8"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
              {product.category}
            </p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-4 text-3xl font-bold">${product.price.toLocaleString()}</p>
          </div>

          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={16} className="fill-black text-black" />
            ))}
            <span className="ml-2 text-xs text-muted-foreground">(47 reviews)</span>
          </div>

          <p className="text-lg leading-relaxed text-black/70">{product.description}</p>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-black/40">Details</p>
            <ul className="space-y-2">
              {product.details.map((d, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-black/70">
                  <div className="h-1 w-1 rounded-full bg-black/30" />
                  {d}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleAdd}
              className={`premium-btn flex-1 group transition-all ${added ? "bg-green-600" : ""}`}
            >
              {added ? (
                <>
                  <Check size={18} className="mr-2" />
                  Added to Cart
                </>
              ) : (
                <>
                  <ShoppingBag size={18} className="mr-2" />
                  Add to Cart
                </>
              )}
            </button>
          </div>

          <div className="rounded-xl bg-black/5 p-4">
            <p className="text-xs text-muted-foreground text-center">
              ✦ Free shipping on orders over $500 &nbsp;•&nbsp; ✦ 30-day returns &nbsp;•&nbsp; ✦ Lifetime warranty
            </p>
          </div>
        </motion.div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <motion.div variants={fadeIn} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-24">
          <h2 className="mb-8 text-center font-serif text-3xl tracking-tight">
            You May Also <span className="italic text-black/40">Like</span>
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {related.map((p) => (
              <Link key={p.id} href={`/products/${p.id}`} className="group">
                <div className="overflow-hidden rounded-2xl bg-muted">
                  <div className="relative aspect-square">
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="33vw"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="font-bold tracking-tight">{p.name}</h3>
                  <p className="text-sm text-muted-foreground">${p.price.toLocaleString()}</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
