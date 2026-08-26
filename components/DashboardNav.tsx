"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { label: "DASHBOARD", href: "/" },
  { label: "INSIGHTS", href: "/insights" },
] as const;

// Componente cliente: usa a URL atual do navegador (usePathname) pra decidir
// qual aba está ativa, em vez de receber isso como prop fixa vinda do
// servidor — assim não tem risco de ficar dessincronizado entre as páginas.
export function DashboardNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-[1600px] gap-1 px-6">
        {ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "border-b-2 px-4 py-3 text-sm font-semibold uppercase tracking-wide transition " +
                (isActive
                  ? "border-brand-500 text-ink"
                  : "border-transparent text-muted hover:text-ink")
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
