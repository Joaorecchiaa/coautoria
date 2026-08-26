import Link from "next/link";

const ITEMS = [
  { key: "dashboard", label: "DASHBOARD", href: "/" },
  { key: "insights", label: "INSIGHTS", href: "/insights" },
] as const;

export function DashboardNav({ current }: { current: "dashboard" | "insights" }) {
  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-[1600px] gap-1 px-6">
        {ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={
              "border-b-2 px-4 py-3 text-sm font-semibold uppercase tracking-wide transition " +
              (current === item.key
                ? "border-brand-500 text-ink"
                : "border-transparent text-muted hover:text-ink")
            }
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
