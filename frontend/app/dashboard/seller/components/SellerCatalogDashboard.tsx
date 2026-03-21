"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, Variants } from "framer-motion";
import { Edit, Eye, Plus, Trash2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";
const FALLBACK_IMAGE = "https://placehold.co/900x900/png?text=No+Image";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

type ProductItem = {
  id: string;
  title: string;
  brand: string;
  status: "draft" | "active" | "archived";
  target_audience: string;
  category_id: string | null;
  created_at: string;
  updated_at: string;
};

type CatalogItem = {
  id: string;
  title: string;
  category: string;
  price_min: number;
  price_max: number;
  image_url: string;
};

export default function SellerCatalogDashboard() {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [catalog, setCatalog] = useState<Record<string, CatalogItem>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProducts = async () => {
    setError("");
    try {
      const [sellerRes, catalogRes] = await Promise.all([
        fetch(`${API}/api/seller/products`, { credentials: "include" }),
        fetch(`${API}/api/products`),
      ]);

      const sellerData = await sellerRes.json();
      if (!sellerRes.ok) {
        setError(sellerData.error || "Failed to load products");
        return;
      }

      setItems(sellerData.items || []);

      const catalogData = await catalogRes.json();
      if (catalogRes.ok && catalogData.items) {
        const map: Record<string, CatalogItem> = {};
        for (const entry of catalogData.items as CatalogItem[]) {
          map[entry.id] = entry;
        }
        setCatalog(map);
      }
    } catch {
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API}/api/seller/products/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete product");
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setError("Failed to delete product");
    } finally {
      setDeletingId(null);
    }
  };

  const statusBadge = (status: ProductItem["status"]) => {
    const map = {
      active: "bg-emerald-100 text-emerald-700 border-emerald-200",
      draft: "bg-amber-100 text-amber-700 border-amber-200",
      archived: "bg-stone-100 text-stone-700 border-stone-200",
    } as const;
    return map[status] ?? map.draft;
  };

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [items]
  );

  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((item) => item.status === "active").length;
    const draft = items.filter((item) => item.status === "draft").length;
    const archived = items.filter((item) => item.status === "archived").length;
    return { total, active, draft, archived };
  }, [items]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground mb-3">Seller Studio</p>
          <h1 className="font-serif text-5xl tracking-tight">Product Library</h1>
          <p className="mt-3 text-muted-foreground">All catalog insights and tools in one place.</p>
        </div>
        <Link href="/dashboard/seller/products/new" className="premium-btn">
          <Plus size={16} className="mr-2" />
          New product
        </Link>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Products" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="Drafts" value={stats.draft} />
        <StatCard label="Archived" value={stats.archived} />
      </div>

      {loading ? (
        <div className="mt-12 flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-black/10 border-t-black" />
          Loading products...
        </div>
      ) : error ? (
        <p className="mt-8 text-sm text-red-600">{error}</p>
      ) : sortedItems.length === 0 ? (
        <div className="mt-12 rounded-[2rem] border border-black/5 bg-white/80 p-12 text-center">
          <p className="text-lg font-semibold">No products yet</p>
          <p className="mt-2 text-sm text-muted-foreground">Create a product to start selling.</p>
          <Link href="/dashboard/seller/products/new" className="premium-btn mt-6 inline-flex">
            Create product
          </Link>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          {sortedItems.map((product) => {
            const catalogItem = catalog[product.id];
            const imageUrl = catalogItem?.image_url || FALLBACK_IMAGE;
            const category = catalogItem?.category || "Catalog";
            const priceMin = catalogItem?.price_min ?? 0;
            const priceMax = catalogItem?.price_max ?? 0;
            const priceLabel = priceMin === priceMax
              ? `$${priceMin.toLocaleString()}`
              : `$${priceMin.toLocaleString()} - $${priceMax.toLocaleString()}`;

            return (
              <motion.div
                key={product.id}
                variants={item}
                className="group overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
              >
                <div className="relative aspect-square bg-muted">
                  <Image
                    src={imageUrl}
                    alt={product.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-transparent" />
                  <div className="absolute left-4 top-4">
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${statusBadge(product.status)}`}>
                      {product.status}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {category}
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-tight">
                    {product.title}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {product.brand ? `${product.brand} - ${product.target_audience}` : `Audience: ${product.target_audience}`}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-black/70">
                    {priceLabel}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Updated {new Date(product.updated_at).toLocaleString()}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {product.status === "active" ? (
                      <Link
                        href={`/products/${product.id}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold"
                      >
                        <Eye size={14} />
                        Preview
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-xl border border-black/5 px-4 py-2 text-sm font-semibold text-muted-foreground opacity-60">
                        <Eye size={14} />
                        Preview
                      </span>
                    )}
                    <Link
                      href={`/dashboard/seller/products/${product.id}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold"
                    >
                      <Edit size={14} />
                      Edit
                    </Link>
                    <button
                      onClick={() => onDelete(product.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600"
                      disabled={deletingId === product.id}
                    >
                      <Trash2 size={14} />
                      {deletingId === product.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[2rem] border border-black/5 bg-white/80 p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-4 text-3xl font-bold">{value}</p>
    </div>
  );
}
