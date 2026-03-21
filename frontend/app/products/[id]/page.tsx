"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { motion, Variants } from "framer-motion";
import { ShoppingBag, ArrowLeft, Check, Star } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/products";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";
const FALLBACK_IMAGE = "https://placehold.co/900x900/png?text=No+Image";

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

type CatalogProduct = {
  id: string;
  title: string;
  description: string;
  brand: string;
  category: string;
  target_audience: string;
  price_min: number;
  price_max: number;
  colors: Array<{ color_id: string; color_name: string; hex_code: string; sort_order: number }>;
  variants: Array<{
    id: string;
    color_id: string;
    sku: string;
    size: string;
    price: number;
    compare_at_price: number | null;
    stock_qty: number;
    is_active: boolean;
  }>;
  images: Array<{
    id: string;
    color_id: string | null;
    image_url: string;
    alt_text: string;
    sort_order: number;
    is_featured: boolean;
  }>;
};

type CatalogListItem = {
  id: string;
  title: string;
  category: string;
  price_min: number;
  price_max: number;
  image_url: string;
};

export default function ProductDetailPage() {
  const params = useParams();
  const productId = typeof params?.id === "string" ? params.id : "";
  const { addItem } = useCart();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [related, setRelated] = useState<CatalogListItem[]>([]);
  const [added, setAdded] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      if (!productId) return;
      try {
        const res = await fetch(`${API}/api/products/${productId}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Product not found");
          return;
        }
        setProduct(data);
        setActiveImage(0);

        const listRes = await fetch(`${API}/api/products`);
        const listData = await listRes.json();
        if (listRes.ok) {
          setRelated(listData.items || []);
        }
      } catch {
        setError("Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [productId]);

  const galleryImages = useMemo(() => {
    if (!product) return [FALLBACK_IMAGE];
    const sorted = [...product.images].sort((a, b) => {
      if (a.is_featured === b.is_featured) return a.sort_order - b.sort_order;
      return a.is_featured ? -1 : 1;
    });
    const urls = sorted.map((img) => img.image_url).filter(Boolean);
    return urls.length ? urls : [FALLBACK_IMAGE];
  }, [product]);

  const heroImage = galleryImages[Math.min(activeImage, galleryImages.length - 1)] ?? FALLBACK_IMAGE;

  useEffect(() => {
    if (galleryImages.length <= 1) return;
    if (isHovering) return;
    const timer = setInterval(() => {
      setActiveImage((prev) => (prev + 1) % galleryImages.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [galleryImages.length, isHovering]);

  const priceLabel = useMemo(() => {
    if (!product) return "";
    const min = product.price_min || product.price_max || 0;
    const max = product.price_max || product.price_min || 0;
    if (min === 0 && max === 0) return "Price on request";
    if (min === max) return `$${min.toLocaleString()}`;
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  }, [product]);

  const detailList = useMemo(() => {
    if (!product) return [] as string[];
    const sizes = Array.from(new Set(product.variants.map((v) => v.size))).join(", ");
    const colors = product.colors.map((c) => c.color_name).join(", ");
    return [
      product.brand ? `Brand: ${product.brand}` : null,
      product.target_audience ? `Audience: ${product.target_audience}` : null,
      sizes ? `Sizes: ${sizes}` : null,
      colors ? `Colors: ${colors}` : null,
    ].filter(Boolean) as string[];
  }, [product]);

  const handleAdd = () => {
    if (!product) return;
    const price = product.price_min || product.price_max || 0;
    const cartProduct: Product = {
      id: product.id,
      name: product.title,
      price,
      category: product.category || "Catalog",
      description: product.description || "Catalog item",
      details: detailList.length ? detailList : ["Selected for you"],
      image: heroImage,
    };
    addItem(cartProduct);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-black/10 border-t-black" />
      </div>
    );
  }

  if (error || !product) {
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

  const relatedItems = related
    .filter((item) => item.id !== product.id && item.category === product.category)
    .slice(0, 3);

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
          className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-black/5 via-white to-black/10 shadow-[0_40px_120px_rgba(0,0,0,0.12)]"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <div className="relative aspect-square">
            <Image
              key={heroImage}
              src={heroImage}
              alt={product.title}
              fill
              className="object-cover transition-opacity duration-700"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
          </div>
          {galleryImages.length > 1 && (
            <div className="border-t border-black/5 bg-white/80 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                  Gallery
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                  {activeImage + 1} / {galleryImages.length}
                </p>
              </div>
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {galleryImages.map((url, idx) => (
                  <button
                    key={`${url}-${idx}`}
                    onClick={() => setActiveImage(idx)}
                    className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border transition-all sm:h-24 sm:w-24 ${
                      idx === activeImage
                        ? "border-black shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
                        : "border-black/10 hover:border-black/30"
                    }`}
                  >
                    <Image
                      src={url}
                      alt={`${product.title} thumbnail ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="120px"
                    />
                    {idx === activeImage && (
                      <span className="absolute inset-x-3 bottom-3 h-0.5 rounded-full bg-white" />
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Auto-plays every few seconds. Hover to pause.
              </p>
            </div>
          )}
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
              {product.title}
            </h1>
            <p className="mt-4 text-3xl font-bold">{priceLabel}</p>
          </div>

          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={16} className="fill-black text-black" />
            ))}
            <span className="ml-2 text-xs text-muted-foreground">(47 reviews)</span>
          </div>

          <p className="text-lg leading-relaxed text-black/70">{product.description}</p>

          {detailList.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-black/40">Details</p>
              <ul className="space-y-2">
                {detailList.map((d, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-black/70">
                    <div className="h-1 w-1 rounded-full bg-black/30" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}

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
              Free shipping on orders over $500 - 30-day returns - Lifetime warranty
            </p>
          </div>
        </motion.div>
      </div>

      {/* Related Products */}
      {relatedItems.length > 0 && (
        <motion.div variants={fadeIn} initial="hidden" whileInView="show" viewport={{ once: true }} className="mt-24">
          <h2 className="mb-8 text-center font-serif text-3xl tracking-tight">
            You May Also <span className="italic text-black/40">Like</span>
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {relatedItems.map((p) => (
              <Link key={p.id} href={`/products/${p.id}`} className="group">
                <div className="overflow-hidden rounded-2xl bg-muted">
                  <div className="relative aspect-square">
                    <Image
                      src={p.image_url || FALLBACK_IMAGE}
                      alt={p.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="33vw"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="font-bold tracking-tight">{p.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    ${Math.max(p.price_min || 0, p.price_max || 0).toLocaleString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
