"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Resumen" },
  { href: "/patrimonio", label: "Patrimonio" },
  { href: "/consultoria", label: "Consultoría" },
];

export function AppNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return null;
  return (
    <nav className="flex items-center gap-1 rounded-xl border bg-surface p-1 text-sm" aria-label="Secciones">
      {LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn("focus-ring rounded-lg px-3 py-1.5 font-medium transition-colors duration-200", active ? "bg-ink text-bg" : "text-muted hover:bg-surface-2 hover:text-ink")}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
