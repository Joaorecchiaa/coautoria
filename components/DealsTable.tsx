"use client";

import { useMemo, useState } from "react";
import type { Deal } from "@/lib/metrics";
import { formatBRL } from "@/lib/metrics";

export function DealsTable({ deals }: { deals: Deal[] }) {
  const [query, setQuery] = useState("");
  const [onlyPendentes, setOnlyPendentes] = useState(false);

  const filtered = useMemo(() => {
    let list = deals;
    if (onlyPendentes) {
      list = list.filter((d) => d.simonato.toUpperCase() !== "OK");
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.nomeCoautor.toLowerCase().includes(q) ||
          d.closer.toLowerCase().includes(q) ||
          d.squad.toLowerCase().includes(q) ||
          d.entregaveis.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) =>
      (b.dataFechamento || "").localeCompare(a.dataFechamento || "")
    );
  }, [deals, query, onlyPendentes]);

  return (
    <div className="rounded-xl2 border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <input
          type="text"
          placeholder="Buscar por coautor, closer, squad ou entregável..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={onlyPendentes}
            onChange={(e) => setOnlyPendentes(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Só pendentes de double-check
        </label>
        <span className="ml-auto text-sm text-muted">
          {filtered.length} de {deals.length} vendas
        </span>
      </div>

      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Fechamento</th>
              <th className="px-4 py-3">Coautor</th>
              <th className="px-4 py-3">Entregável</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3">Squad</th>
              <th className="px-4 py-3">Closer</th>
              <th className="px-4 py-3">Double-check</th>
              <th className="px-4 py-3">Pipe</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d, i) => (
              <tr key={`${d.pipe}-${i}`} className="border-b border-border/60 last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  {d.dataFechamento || "—"}
                </td>
                <td className="px-4 py-3 font-medium text-ink">{d.nomeCoautor}</td>
                <td className="px-4 py-3 text-muted">{d.entregaveis}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {formatBRL(d.valor)}
                </td>
                <td className="px-4 py-3 text-muted">{d.squad || "—"}</td>
                <td className="px-4 py-3 text-muted">{d.closer || "—"}</td>
                <td className="px-4 py-3">
                  {d.simonato.toUpperCase() === "OK" ? (
                    <span className="rounded-full bg-accent-teal/10 px-2.5 py-1 text-xs font-medium text-accent-teal">
                      OK
                    </span>
                  ) : (
                    <span className="rounded-full bg-accent-amber/10 px-2.5 py-1 text-xs font-medium text-accent-amber">
                      Pendente
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {d.pipe ? (
                    <a
                      href={d.pipe}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-600 underline decoration-brand-300 underline-offset-2 hover:text-brand-700"
                    >
                      abrir
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted">
                  Nenhuma venda encontrada.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
