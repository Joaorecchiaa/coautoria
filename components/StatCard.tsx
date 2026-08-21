export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-xl2 border border-border bg-card p-5 shadow-card">
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
    </div>
  );
}
