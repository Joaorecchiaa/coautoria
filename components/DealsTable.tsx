"use client";

import { useMemo, useState } from "react";
import type { Deal } from "@/lib/metrics";
import { formatBRL, formatMonthLabel, monthKeyOf } from "@/lib/metrics";

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function DealsTable({ deals }: { deals: Deal[] }) {
  const [dealsState, setDealsState] = useState(deals);
  const [query, setQuery] = useState("");
  const [livroFilter, setLivroFilter] = useState("");
  const [onlyPendentes, setOnlyPendentes] = useState(false);
  const [savingRow, setSavingRow] = useState<number | null>(null);
  const [errorRow, setErrorRow] = useState<number | null>(null);

  const livroOptions = useMemo(() => {
    const set = new Set(dealsState.map((d) => d.livro).filter(Boolean));
    return [...set].sort();
  }, [dealsState]);

  const filtered = useMemo(() => {
    let list = dealsState;
    if (onlyPendentes) {
      list = list.filter((d) => d.simonato.toUpperCase() !== "OK");
    }
    if (livroFilter) {
      list = list.filter((d) => d.livro === livroFilter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.nomeCoautor.toLowerCase().includes(q) ||
          d.closer.toLowerCase().includes(q) ||
          d.squad.toLowerCase().includes(q) ||
          d.livro.toLowerCase().includes(q) ||
          d.entregaveis.toLowerCase().includes(q) ||
          d.email.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => (b.dataFechamento || "").localeCompare(a.dataFechamento || ""));
  }, [dealsState, query, livroFilter, onlyPendentes]);

  const thisMonth = currentMonthKey();
  const currentMonthDeals = filtered.filter((d) => monthKeyOf(d) === thisMonth);
  const historyGroups = useMemo(() => {
    const map = new Map<string, Deal[]>();
    for (const d of filtered) {
      const key = monthKeyOf(d) || "sem-data";
      if (key === thisMonth) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [filtered, thisMonth]);

  async function markOk(rowNumber: number) {
    setSavingRow(rowNumber);
    setErrorRow(null);
    try {
      const res = await fetch("/api/mark-ok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowNumber }),
      });
      if (!res.ok) throw new Error("falha ao salvar");
      setDealsState((prev) =>
        prev.map((d) => (d.rowNumber === rowNumber ? { ...d, simonato: "OK" } : d))
      );
    } catch {
      setErrorRow(rowNumber);
    } finally {
      setSavingRow(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl2 border border-border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Buscar por coautor, closer, squad, livro, entregável ou e-mail..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <select
            value={livroFilter}
            onChange={(e) => setLivroFilter(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-500"
          >
            <option value="">Todos os livros</option>
            {livroOptions.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={onlyPendentes}
              onChange={(e) => setOnlyPendentes(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Só pendentes de double-check
          </label>
          <span className="ml-auto text-sm text-muted">{filtered.length} vendas</span>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Vendas deste mês ({currentMonthDeals.length})
        </h3>
        <DealsTableGrid
          deals={currentMonthDeals}
          onMarkOk={markOk}
          savingRow={savingRow}
          errorRow={errorRow}
          emptyLabel="Nenhuma venda fechada este mês ainda."
        />
      </div>

      {historyGroups.length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Histórico
          </h3>
          <div className="space-y-3">
            {historyGroups.map(([key, groupDeals]) => (
              <details
                key={key}
                className="group rounded-xl2 border border-border bg-card shadow-card"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-sm font-medium text-ink">
                  <span>{key === "sem-data" ? "Sem data" : formatMonthLabel(key)}</span>
                  <span className="text-muted">{groupDeals.length} venda(s)</span>
                </summary>
                <div className="border-t border-border">
                  <DealsTableGrid
                    deals={groupDeals}
                    onMarkOk={markOk}
                    savingRow={savingRow}
                    errorRow={errorRow}
                  />
                </div>
              </details>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DealsTableGrid({
  deals,
  onMarkOk,
  savingRow,
  errorRow,
  emptyLabel = "Nenhuma venda encontrada.",
}: {
  deals: Deal[];
  onMarkOk: (rowNumber: number) => void;
  savingRow: number | null;
  errorRow: number | null;
  emptyLabel?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl2 border border-border bg-card shadow-card">
      <div className="max-h-[520px] overflow-auto">
        <table className="w-full min-w-[1300px] text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Fechamento</th>
              <th className="px-4 py-3">Livro</th>
              <th className="px-4 py-3">Coautor</th>
              <th className="px-4 py-3">Entregável</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3">Squad</th>
              <th className="px-4 py-3">Closer</th>
              <th className="px-4 py-3">Celular</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">LinkedIn</th>
              <th className="px-4 py-3">Double-check</th>
              <th className="px-4 py-3">Pipe</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => {
              const isOk = d.simonato.toUpperCase() === "OK";
              const isSaving = savingRow === d.rowNumber;
              const hasError = errorRow === d.rowNumber;
              return (
                <tr key={d.rowNumber} className="border-b border-border/60 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {d.dataFechamento || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{d.livro || "—"}</td>
                  <td className="px-4 py-3 font-medium text-ink">{d.nomeCoautor}</td>
                  <td className="px-4 py-3 text-muted">{d.entregaveis}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatBRL(d.valor)}
                  </td>
                  <td className="px-4 py-3 text-muted">{d.squad || "—"}</td>
                  <td className="px-4 py-3 text-muted">{d.closer || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {d.celular ? (
                      <a href={`tel:${d.celular}`} className="text-muted hover:text-ink">
                        {d.celular}
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {d.email ? (
                      <a href={`mailto:${d.email}`} className="text-muted hover:text-ink">
                        {d.email}
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {d.linkedin ? (
                      <a
                        href={d.linkedin.startsWith("http") ? d.linkedin : `https://${d.linkedin}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-600 underline decoration-brand-300 underline-offset-2 hover:text-brand-700"
                      >
                        perfil
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isOk ? (
                      <span className="rounded-full bg-accent-teal/10 px-2.5 py-1 text-xs font-medium text-accent-teal">
                        OK
                      </span>
                    ) : (
                      <button
                        onClick={() => onMarkOk(d.rowNumber)}
                        disabled={isSaving}
                        className="rounded-full bg-accent-amber/10 px-2.5 py-1 text-xs font-medium text-accent-amber transition hover:bg-accent-amber/20 disabled:opacity-60"
                      >
                        {isSaving ? "Salvando..." : "Marcar OK"}
                      </button>
                    )}
                    {hasError ? (
                      <div className="mt-1 text-xs text-accent-coral">Erro ao salvar, tente de novo</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {d.pipe && d.pipe.startsWith("http") ? (
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
              );
            })}
            {deals.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center text-muted">
                  {emptyLabel}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
