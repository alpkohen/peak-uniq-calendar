"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/overview", label: "Özet" },
  { href: "/", label: "Takvim" },
  { href: "/data", label: "Veriler" },
  { href: "/clients", label: "Fiyat" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/revenue", label: "Gelir" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="app-nav" aria-label="Ana menü">
      {navItems.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            data-active={active ? "true" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
