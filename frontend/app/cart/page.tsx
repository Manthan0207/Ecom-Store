"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, Variants } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ArrowLeft } from "lucide-react";
import { useCart } from "@/lib/cart-context";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function CartPage() {
  const { items, updateQuantity, removeItem, totalItems, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mx-auto mb-6 inline-flex items-center justify-center rounded-2xl bg-black/5 p-6">
            <ShoppingBag size={40} className="text-black/30" />
          </div>
          <h1 className="font-serif text-4xl tracking-tight">Your Cart is Empty</h1>
          <p className="mt-3 text-muted-foreground">
            Discover our curated collection and find something you love.
          </p>
          <Link href="/products" className="premium-btn mt-8 inline-flex group">
            Explore Collection
            <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    );
  }

  const shipping = totalPrice > 500 ? 0 : 25;
  const finalTotal = totalPrice + shipping;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:py-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-black mb-8"
        >
          <ArrowLeft size={16} />
          Continue Shopping
        </Link>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 font-serif text-4xl tracking-tight sm:text-5xl"
      >
        Shopping <span className="italic text-black/40">Bag</span>
        <span className="ml-3 text-lg font-sans text-muted-foreground">({totalItems})</span>
      </motion.h1>

      <div className="grid gap-12 lg:grid-cols-3">
        {/* Cart Items */}
        <motion.div variants={container} initial="hidden" animate="show" className="lg:col-span-2 space-y-0">
          {items.map((cartItem) => (
            <motion.div
              key={cartItem.product.id}
              variants={item}
              layout
              className="flex gap-6 border-b border-black/5 py-8 first:pt-0"
            >
              <Link href={`/products/${cartItem.product.id}`} className="flex-shrink-0">
                <div className="relative h-28 w-28 overflow-hidden rounded-xl bg-muted sm:h-36 sm:w-36">
                  <Image
                    src={cartItem.product.image}
                    alt={cartItem.product.name}
                    fill
                    className="object-cover"
                    sizes="150px"
                  />
                </div>
              </Link>

              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {cartItem.product.category}
                  </p>
                  <Link href={`/products/${cartItem.product.id}`}>
                    <h3 className="mt-1 text-lg font-bold tracking-tight hover:text-black/70 transition-colors">
                      {cartItem.product.name}
                    </h3>
                  </Link>
                  <p className="mt-1 text-sm font-medium">${cartItem.product.price.toLocaleString()}</p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1 rounded-xl border border-black/10 overflow-hidden">
                    <button
                      onClick={() => updateQuantity(cartItem.product.id, cartItem.quantity - 1)}
                      className="px-3 py-2 transition-colors hover:bg-black/5"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="min-w-[2rem] text-center text-sm font-bold">{cartItem.quantity}</span>
                    <button
                      onClick={() => updateQuantity(cartItem.product.id, cartItem.quantity + 1)}
                      className="px-3 py-2 transition-colors hover:bg-black/5"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <p className="text-sm font-bold">
                      ${(cartItem.product.price * cartItem.quantity).toLocaleString()}
                    </p>
                    <button
                      onClick={() => removeItem(cartItem.product.id)}
                      className="rounded-lg p-2 text-black/30 transition-all hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="sticky top-24 glass-dark rounded-[2rem] p-8 shadow-2xl">
            <h2 className="text-lg font-bold tracking-tight mb-6">Order Summary</h2>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">{shipping === 0 ? "Free" : `$${shipping}`}</span>
              </div>
              <div className="h-px bg-black/10" />
              <div className="flex justify-between text-base">
                <span className="font-bold">Total</span>
                <span className="font-bold">${finalTotal.toLocaleString()}</span>
              </div>
            </div>

            {shipping === 0 && (
              <p className="mt-4 rounded-lg bg-green-500/10 p-3 text-center text-xs font-medium text-green-700">
                ✦ You qualify for free shipping
              </p>
            )}

            <button className="premium-btn w-full mt-6 group">
              Checkout
              <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
            </button>

            <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
              Secure checkout • SSL encrypted
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
