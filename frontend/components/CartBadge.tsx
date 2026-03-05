"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";

export default function CartBadge() {
  const { totalItems } = useCart();

  return (
    <Link
      href="/cart"
      className="relative flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-black rounded-lg hover:bg-black/5"
    >
      <ShoppingBag size={16} />
      <span className="hidden sm:inline">Bag</span>
      {totalItems > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
          {totalItems > 9 ? "9+" : totalItems}
        </span>
      )}
    </Link>
  );
}
