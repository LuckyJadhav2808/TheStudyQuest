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
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon-maskable.svg",
  },
  appleWebApp: { capable: true, title: "StudyQuest", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4e7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem('sq-theme')||'pastel';var s=localStorage.getItem('sq-surface')||'classic';var d=t==='obsidian'||t==='ink'||(t==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=d?'obsidian':'pastel';var n=s==='neumorphic'?'neumorphic':'classic';var r=document.documentElement;r.dataset.theme=e;r.dataset.surface=n;var c=e==='obsidian'?(n==='neumorphic'?'#151518':'#000000'):(n==='neumorphic'?'#efe3f7':'#f4e7fb');var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',c);}catch(x){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
