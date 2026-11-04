import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import { AppNav } from "@/components/app-nav";
import { BrandMark } from "@/components/brand-mark";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const fontInterTight = Inter_Tight({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const fontJetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: BRAND.sub,
};

export const viewport: Viewport = { themeColor: "#f6f4ef", colorScheme: "light" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fontInterTight.variable} ${fontJetBrainsMono.variable}`} style={{ "--font-display": "var(--font-sans)" } as React.CSSProperties}>
      <body>
        <a href="#main" className="skip-link">Saltar al contenido</a>
        <div className="ambient" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <header className="sticky top-0 z-30 border-b bg-bg/70 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="focus-ring flex items-center gap-2.5 rounded-lg">
              <BrandMark className="h-8 w-8 transition-transform duration-300 hover:rotate-[-8deg]" />
              <span className="font-display text-[15px] font-semibold tracking-tight" translate="no">
                {BRAND.name}
              </span>
            </Link>
            <AppNav />
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-4 pb-16 pt-8">
          {children}
        </main>
      </body>
    </html>
  );
}
