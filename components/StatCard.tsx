import Link from "next/link";

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning";
  href?: string;
}) {
  const content = (
    <>
      <div className="text-sm text-muted">{label}</div>
      <div
        className={
          "mt-1 text-2xl font-semibold tabular-nums " +
          (tone === "warning" ? "text-accent-amber" : "text-ink")
        }
      >
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl2 border border-border bg-card p-5 shadow-card transition hover:border-brand-400 hover:shadow-md"
      >
        {content}
      </Link>
    );
  }

  return <div className="rounded-xl2 border border-border bg-card p-5 shadow-card">{content}</div>;
}
