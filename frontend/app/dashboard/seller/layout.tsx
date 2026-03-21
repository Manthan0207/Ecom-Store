import type { ReactNode } from "react";
import SellerLayout from "./components/SellerLayout";

export default function Layout({ children }: { children: ReactNode }) {
  return <SellerLayout>{children}</SellerLayout>;
}
