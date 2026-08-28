import "@fontsource/fraunces/600.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "Samosa & Co. · Shop Manager",
  description: "Daily sales, inventory, expenses, LPG and customer accounts for a busy food shop.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#f4ebd9", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body>{children}<ServiceWorkerRegistration /></body></html>;
}
