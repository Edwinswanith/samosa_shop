import type { Product } from "./types";

export const shopProducts: Product[] = [
  { id: "samosa", name: "Samosa", defaultPrice: "14.00", active: true, color: "#c8672a" },
  { id: "chicken-roll", name: "Kathi roll (chicken)", defaultPrice: "65.00", active: true, color: "#a7442d" },
  { id: "paneer-roll", name: "Kathi roll (veg, paneer)", defaultPrice: "45.00", active: true, color: "#61764b" },
  { id: "veg-cutlet", name: "Cutlet (veg)", defaultPrice: "15.00", active: true, color: "#61764b" },
  { id: "chicken-cutlet", name: "Cutlet (chicken)", defaultPrice: "18.00", active: true, color: "#a7442d" },
  { id: "kathi-roll", name: "Kathi roll (type unspecified)", defaultPrice: "65.00", active: false, color: "#61764b" },
];

export function mergeShopProducts(products: Product[] = []): Product[] {
  const known = new Set(shopProducts.map((product) => product.id));
  return [...shopProducts.map((product) => ({ ...product })), ...products.filter((product) => !known.has(product.id))];
}
