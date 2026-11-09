"use client";
import { createContext, useContext } from "react";
import type { ShopSale } from "@/lib/sale-price";

const SaleContext = createContext<ShopSale[]>([]);

export function SaleProvider({
  sales,
  children,
}: {
  sales: ShopSale[];
  children: React.ReactNode;
}) {
  return <SaleContext.Provider value={sales}>{children}</SaleContext.Provider>;
}

export function useSales() {
  return useContext(SaleContext);
}
