import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import { Providers } from "@/components/shell/Providers";
import "./globals.css";
import "katex/dist/katex.min.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const sans = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "StudyQuest",
  description: "A gamified, offline-first study operating system. Focus, notes, code, habits and pets in one app.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "StudyQuest", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { themeColor: "#0B0B0C", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
