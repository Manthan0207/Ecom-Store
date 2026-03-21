"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Trash2, Image as ImageIcon, Save, AlertTriangle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget: (options: Record<string, unknown>, callback: (error: unknown, result: any) => void) => {
        open: () => void;
      };
    };
  }
}

type SellerColor = {
  id: string;
  name: string;
  hex_code: string;
};

type ProductResponse = {
  id: string;
  title: string;
  description: string;
  brand: string;
  status: "draft" | "active" | "archived";
  target_audience: "men" | "women" | "kids" | "unisex";
  category_id: string | null;
  colors: Array<{ color_id: string; sort_order: number; color_name: string; hex_code: string }>;
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

type FormColor = {
  color_id: string;
  sort_order: string;
};

type FormVariant = {
  color_id: string;
  sku: string;
  size: string;
  price: string;
  compare_at_price: string;
  stock_qty: string;
  is_active: boolean;
};

type FormImage = {
  color_id: string;
  image_url: string;
  alt_text: string;
  sort_order: string;
  is_featured: boolean;
};

type FormState = {
  title: string;
  description: string;
  brand: string;
  category_id: string;
  target_audience: "men" | "women" | "kids" | "unisex";
  status: "draft" | "active" | "archived";
  colors: FormColor[];
  variants: FormVariant[];
  images: FormImage[];
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  brand: "",
  category_id: "",
  target_audience: "men",
  status: "draft",
  colors: [{ color_id: "", sort_order: "0" }],
  variants: [
    {
      color_id: "",
      sku: "",
      size: "",
      price: "",
      compare_at_price: "",
      stock_qty: "",
      is_active: true,
    },
  ],
  images: [
    {
      color_id: "",
      image_url: "",
      alt_text: "",
      sort_order: "0",
      is_featured: true,
    },
  ],
};

export default function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const [colors, setColors] = useState<SellerColor[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(Boolean(productId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cloudinaryReady, setCloudinaryReady] = useState(false);
  const [cloudinaryError, setCloudinaryError] = useState("");

  useEffect(() => {
    const loadColors = async () => {
      const res = await fetch(`${API}/api/seller/colors`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load colors");
      }
      return data.items as SellerColor[];
    };

    const loadProduct = async () => {
      if (!productId) return null;
      const res = await fetch(`${API}/api/seller/products/${productId}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load product");
      }
      return data as ProductResponse;
    };

    const run = async () => {
      try {
        const [colorItems, product] = await Promise.all([loadColors(), loadProduct()]);
        setColors(colorItems);

        if (product) {
          setForm({
            title: product.title,
            description: product.description,
            brand: product.brand,
            category_id: product.category_id ?? "",
            target_audience: product.target_audience,
            status: product.status,
            colors: product.colors.map((color) => ({
              color_id: color.color_id,
              sort_order: String(color.sort_order ?? 0),
            })),
            variants: product.variants.map((variant) => ({
              color_id: variant.color_id,
              sku: variant.sku,
              size: variant.size,
              price: String(variant.price),
              compare_at_price: variant.compare_at_price === null ? "" : String(variant.compare_at_price),
              stock_qty: String(variant.stock_qty),
              is_active: variant.is_active,
            })),
            images: product.images.map((image) => ({
              color_id: image.color_id ?? "",
              image_url: image.image_url,
              alt_text: image.alt_text,
              sort_order: String(image.sort_order ?? 0),
              is_featured: image.is_featured,
            })),
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load data";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [productId]);

  useEffect(() => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      setCloudinaryError("Missing Cloudinary env vars. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.");
      return;
    }

    if (window.cloudinary) {
      setCloudinaryReady(true);
      return;
    }

    const existing = document.getElementById("cloudinary-widget");
    if (existing) {
      existing.addEventListener("load", () => setCloudinaryReady(true));
      return;
    }

    const script = document.createElement("script");
    script.id = "cloudinary-widget";
    script.src = "https://widget.cloudinary.com/v2.0/global/all.js";
    script.async = true;
    script.onload = () => setCloudinaryReady(true);
    script.onerror = () => setCloudinaryError("Failed to load Cloudinary widget.");
    document.body.appendChild(script);
  }, []);

  const selectedColorIds = useMemo(
    () => form.colors.map((color) => color.color_id).filter(Boolean),
    [form.colors]
  );

  const availableColors = useMemo(
    () => colors.filter((color) => selectedColorIds.includes(color.id)),
    [colors, selectedColorIds]
  );

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateColor = (index: number, field: keyof FormColor, value: string) => {
    setForm((prev) => {
      const next = [...prev.colors];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, colors: next };
    });
  };

  const updateVariant = (index: number, field: keyof FormVariant, value: string | boolean) => {
    setForm((prev) => {
      const next = [...prev.variants];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, variants: next };
    });
  };

  const updateImage = (index: number, field: keyof FormImage, value: string | boolean) => {
    setForm((prev) => {
      const next = [...prev.images];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, images: next };
    });
  };

  const addColor = () =>
    setForm((prev) => ({
      ...prev,
      colors: [...prev.colors, { color_id: "", sort_order: String(prev.colors.length) }],
    }));

  const addVariant = () =>
    setForm((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          color_id: "",
          sku: "",
          size: "",
          price: "",
          compare_at_price: "",
          stock_qty: "",
          is_active: true,
        },
      ],
    }));

  const addImage = () =>
    setForm((prev) => ({
      ...prev,
      images: [
        ...prev.images,
        {
          color_id: "",
          image_url: "",
          alt_text: "",
          sort_order: String(prev.images.length),
          is_featured: false,
        },
      ],
    }));

  const removeColor = (index: number) => {
    setForm((prev) => {
      const next = prev.colors.filter((_, i) => i !== index);
      return { ...prev, colors: next.length ? next : [{ color_id: "", sort_order: "0" }] };
    });
  };

  const removeVariant = (index: number) => {
    setForm((prev) => {
      const next = prev.variants.filter((_, i) => i !== index);
      return {
        ...prev,
        variants: next.length
          ? next
          : [
              {
                color_id: "",
                sku: "",
                size: "",
                price: "",
                compare_at_price: "",
                stock_qty: "",
                is_active: true,
              },
            ],
      };
    });
  };

  const removeImage = (index: number) => {
    setForm((prev) => {
      const next = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        images: next.length
          ? next
          : [
              {
                color_id: "",
                image_url: "",
                alt_text: "",
                sort_order: "0",
                is_featured: true,
              },
            ],
      };
    });
  };

  const handleUpload = (index: number) => {
    setError("");
    setSuccess("");

    if (!window.cloudinary || !cloudinaryReady) {
      setCloudinaryError("Cloudinary widget is not ready.");
      return;
    }

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      setCloudinaryError("Missing Cloudinary env vars. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.");
      return;
    }

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: CLOUDINARY_CLOUD_NAME,
        uploadPreset: CLOUDINARY_UPLOAD_PRESET,
        sources: ["local", "url", "camera"],
        multiple: false,
        folder: "seller-products",
        maxFileSize: 10_000_000,
      },
      (uploadError, result) => {
        if (uploadError) {
          setCloudinaryError("Upload failed. Please try again.");
          return;
        }

        if (result?.event === "success") {
          const secureUrl = result.info?.secure_url as string | undefined;
          const filename = result.info?.original_filename as string | undefined;
          if (secureUrl) {
            updateImage(index, "image_url", secureUrl);
            if (!form.images[index]?.alt_text && filename) {
              updateImage(index, "alt_text", filename.replace(/[-_]/g, " "));
            }
          }
        }
      }
    );

    widget.open();
  };

  const validate = () => {
    if (!form.title.trim()) return "Title is required";
    if (!form.brand.trim()) return "Brand is required";
    if (!form.description.trim()) return "Description is required";

    const colorIds = form.colors.map((color) => color.color_id).filter(Boolean);
    if (colorIds.length === 0) return "At least one color is required";
    if (form.colors.some((color) => !color.color_id)) return "Each color needs an id";

    if (form.variants.length === 0) return "At least one variant is required";

    const colorSet = new Set(colorIds);
    for (const variant of form.variants) {
      if (!variant.color_id) return "Each variant must include a color";
      if (!colorSet.has(variant.color_id)) return "Variant colors must exist in colors list";
      if (!variant.sku.trim()) return "Each variant needs a SKU";
      if (!variant.size.trim()) return "Each variant needs a size";
      if (variant.price.trim() === "") return "Each variant needs a price";
      if (variant.stock_qty.trim() === "") return "Each variant needs stock quantity";
    }

    for (const image of form.images) {
      if (!image.image_url.trim()) return "Each image needs a URL";
      if (image.color_id && !colorSet.has(image.color_id)) {
        return "Image colors must exist in colors list";
      }
    }

    return "";
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      brand: form.brand.trim(),
      category_id: form.category_id.trim(),
      target_audience: form.target_audience,
      status: form.status,
      colors: form.colors.map((color, index) => ({
        color_id: color.color_id,
        sort_order: Number.parseInt(color.sort_order || String(index), 10) || 0,
      })),
      variants: form.variants.map((variant) => ({
        color_id: variant.color_id,
        sku: variant.sku.trim(),
        size: variant.size.trim(),
        price: Number(variant.price),
        compare_at_price: variant.compare_at_price ? Number(variant.compare_at_price) : null,
        stock_qty: Number(variant.stock_qty),
        is_active: variant.is_active,
      })),
      images: form.images.map((image, index) => ({
        color_id: image.color_id ? image.color_id : null,
        image_url: image.image_url.trim(),
        alt_text: image.alt_text.trim(),
        sort_order: Number.parseInt(image.sort_order || String(index), 10) || 0,
        is_featured: image.is_featured,
      })),
    };

    try {
      const res = await fetch(
        productId ? `${API}/api/seller/products/${productId}` : `${API}/api/seller/products`,
        {
          method: productId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save product");
        return;
      }

      setSuccess(productId ? "Product updated" : "Product created");
      if (!productId && data.id) {
        router.push(`/dashboard/seller/products/${data.id}`);
        router.refresh();
      }
    } catch {
      setError("Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-black/10 border-t-black" />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="glass-dark rounded-[2rem] p-8 shadow-2xl">
        <h2 className="text-2xl font-bold tracking-tight">Core details</h2>
        <p className="mt-2 text-sm text-muted-foreground">Define the essentials of your product.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-black/40">Title</span>
            <input
              className="premium-input"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Premium Linen Shirt"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-black/40">Brand</span>
            <input
              className="premium-input"
              value={form.brand}
              onChange={(e) => updateField("brand", e.target.value)}
              placeholder="Vesture"
            />
          </label>
        </div>

        <label className="mt-4 block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-black/40">Description</span>
          <textarea
            className="premium-input min-h-[120px]"
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Soft linen shirt for daily wear."
          />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-black/40">Category ID</span>
            <input
              className="premium-input"
              value={form.category_id}
              onChange={(e) => updateField("category_id", e.target.value)}
              placeholder="optional"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-black/40">Audience</span>
            <select
              className="premium-input"
              value={form.target_audience}
              onChange={(e) => updateField("target_audience", e.target.value as FormState["target_audience"])}
            >
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="kids">Kids</option>
              <option value="unisex">Unisex</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-black/40">Status</span>
            <select
              className="premium-input"
              value={form.status}
              onChange={(e) => updateField("status", e.target.value as FormState["status"])}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-black/5 bg-white/80 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Colors</h2>
            <p className="mt-2 text-sm text-muted-foreground">Select the colors you want to sell.</p>
          </div>
          <button type="button" onClick={addColor} className="premium-btn-outline">
            <Plus size={16} />
            Add color
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {form.colors.map((color, index) => (
            <div key={`color-${index}`} className="grid gap-4 rounded-2xl border border-black/5 bg-white/70 p-4 sm:grid-cols-[2fr_1fr_auto]">
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-black/40">Color</span>
                <select
                  className="premium-input"
                  value={color.color_id}
                  onChange={(e) => updateColor(index, "color_id", e.target.value)}
                >
                  <option value="">Select a color</option>
                  {colors.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name} ({option.hex_code})
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-black/40">Sort Order</span>
                <input
                  type="number"
                  className="premium-input"
                  value={color.sort_order}
                  onChange={(e) => updateColor(index, "sort_order", e.target.value)}
                />
              </label>
              <div className="flex items-end justify-end gap-2">
                {color.color_id && (
                  <div
                    className="h-10 w-10 rounded-2xl border border-black/10"
                    style={{
                      backgroundColor: colors.find((item) => item.id === color.color_id)?.hex_code || "#f5f5f7",
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeColor(index)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 text-muted-foreground hover:bg-black/5"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-dark rounded-[2rem] p-8 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Variants</h2>
            <p className="mt-2 text-sm text-muted-foreground">Define sizes and pricing per color.</p>
          </div>
          <button type="button" onClick={addVariant} className="premium-btn-outline">
            <Plus size={16} />
            Add variant
          </button>
        </div>

        {selectedColorIds.length === 0 && (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
            <AlertTriangle size={16} />
            Add at least one color to unlock variant selection.
          </div>
        )}

        <div className="mt-6 space-y-4">
          {form.variants.map((variant, index) => (
            <div key={`variant-${index}`} className="rounded-2xl border border-black/5 bg-white/70 p-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-black/40">Color</span>
                  <select
                    className="premium-input"
                    value={variant.color_id}
                    onChange={(e) => updateVariant(index, "color_id", e.target.value)}
                  >
                    <option value="">Select color</option>
                    {availableColors.map((color) => (
                      <option key={color.id} value={color.id}>
                        {color.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-black/40">SKU</span>
                  <input
                    className="premium-input"
                    value={variant.sku}
                    onChange={(e) => updateVariant(index, "sku", e.target.value)}
                    placeholder="LINEN-BLK-M"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-black/40">Size</span>
                  <input
                    className="premium-input"
                    value={variant.size}
                    onChange={(e) => updateVariant(index, "size", e.target.value)}
                    placeholder="M"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-black/40">Stock Qty</span>
                  <input
                    type="number"
                    className="premium-input"
                    value={variant.stock_qty}
                    onChange={(e) => updateVariant(index, "stock_qty", e.target.value)}
                    placeholder="0"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-black/40">Price</span>
                  <input
                    type="number"
                    className="premium-input"
                    value={variant.price}
                    onChange={(e) => updateVariant(index, "price", e.target.value)}
                    placeholder="1999"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-black/40">Compare At</span>
                  <input
                    type="number"
                    className="premium-input"
                    value={variant.compare_at_price}
                    onChange={(e) => updateVariant(index, "compare_at_price", e.target.value)}
                    placeholder="2499"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-black/40">Active</span>
                  <select
                    className="premium-input"
                    value={variant.is_active ? "yes" : "no"}
                    onChange={(e) => updateVariant(index, "is_active", e.target.value === "yes")}
                  >
                    <option value="yes">Active</option>
                    <option value="no">Inactive</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-4 py-2 text-sm text-muted-foreground hover:bg-black/5"
                >
                  <Trash2 size={16} />
                  Remove variant
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-black/5 bg-white/80 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Images</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload images to Cloudinary or paste final URLs, then map them to colors.
            </p>
          </div>
          <button type="button" onClick={addImage} className="premium-btn-outline">
            <Plus size={16} />
            Add image
          </button>
        </div>

        {cloudinaryError && (
          <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
            {cloudinaryError}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {form.images.map((image, index) => (
            <div key={`image-${index}`} className="rounded-2xl border border-black/5 bg-white/70 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-black/40">Image URL</span>
                  <input
                    className="premium-input"
                    value={image.image_url}
                    onChange={(e) => updateImage(index, "image_url", e.target.value)}
                    placeholder="https://res.cloudinary.com/..."
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-black/40">Alt Text</span>
                  <input
                    className="premium-input"
                    value={image.alt_text}
                    onChange={(e) => updateImage(index, "alt_text", e.target.value)}
                    placeholder="Black shirt front"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-black/40">Color (optional)</span>
                  <select
                    className="premium-input"
                    value={image.color_id}
                    onChange={(e) => updateImage(index, "color_id", e.target.value)}
                  >
                    <option value="">No color</option>
                    {availableColors.map((color) => (
                      <option key={color.id} value={color.id}>
                        {color.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-black/40">Sort Order</span>
                  <input
                    type="number"
                    className="premium-input"
                    value={image.sort_order}
                    onChange={(e) => updateImage(index, "sort_order", e.target.value)}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-black/40">Featured</span>
                  <select
                    className="premium-input"
                    value={image.is_featured ? "yes" : "no"}
                    onChange={(e) => updateImage(index, "is_featured", e.target.value === "yes")}
                  >
                    <option value="yes">Featured</option>
                    <option value="no">Standard</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ImageIcon size={14} />
                  {image.image_url ? "Preview in new tab to confirm" : "Add a URL to enable preview"}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpload(index)}
                    disabled={!cloudinaryReady}
                    className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-4 py-2 text-sm text-black hover:bg-black/5 disabled:opacity-50"
                  >
                    <ImageIcon size={16} />
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-4 py-2 text-sm text-muted-foreground hover:bg-black/5"
                  >
                    <Trash2 size={16} />
                    Remove image
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {(error || success) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border px-5 py-4 text-sm ${
            error ? "border-red-200 bg-red-50 text-red-600" : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {error || success}
        </motion.div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button type="submit" disabled={saving} className="premium-btn">
          {saving ? "Saving..." : "Save product"}
          <Save size={16} className="ml-2" />
        </button>
      </div>
    </form>
  );
}
