"use client";

import { useEffect, useMemo, useState } from "react";
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

  // Catálogo de livros cadastrados (colunas Q/R da planilha: nome + vagas) —
  // usado pra montar o dropdown de cada venda e o painel de vagas. Carrega
  // uma vez ao abrir o dashboard.
  const [livroCatalog, setLivroCatalog] = useState<{ nome: string; vagas: number | null }[]>([]);
  const [savingLivroRow, setSavingLivroRow] = useState<number | null>(null);
  const [cadastrandoLivro, setCadastrandoLivro] = useState(false);

  useEffect(() => {
    fetch("/api/livros")
      .then((res) => res.json())
      .then((data) => setLivroCatalog(data.livros || []))
      .catch(() => {});
  }, []);

  const livroOptions = useMemo(() => {
    const set = new Set([
      ...livroCatalog.map((l) => l.nome),
      ...dealsState.map((d) => d.livro).filter(Boolean),
    ]);
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [dealsState, livroCatalog]);

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

  async function toggleSimonato(rowNumber: number, next: "OK" | "-") {
    setSavingRow(rowNumber);
    setErrorRow(null);
    try {
      const res = await fetch("/api/mark-ok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowNumber, value: next }),
      });
      if (!res.ok) throw new Error("falha ao salvar");
      setDealsState((prev) =>
        prev.map((d) => (d.rowNumber === rowNumber ? { ...d, simonato: next } : d))
      );
    } catch {
      setErrorRow(rowNumber);
    } finally {
      setSavingRow(null);
    }
  }

  async function updateLivro(rowNumber: number, livro: string) {
    setSavingLivroRow(rowNumber);
    try {
      const res = await fetch("/api/set-livro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowNumber, livro }),
      });
      if (!res.ok) throw new Error("falha ao salvar livro");
      setDealsState((prev) =>
        prev.map((d) => (d.rowNumber === rowNumber ? { ...d, livro } : d))
      );
    } catch {
      // silencioso — o select volta pro valor salvo no próximo carregamento
    } finally {
      setSavingLivroRow(null);
    }
  }

  async function cadastrarLivro() {
    const nomeRaw = window.prompt("Nome do livro (novo, ou já existente pra ajustar as vagas):");
    if (!nomeRaw || !nomeRaw.trim()) return;
    const nome = nomeRaw.trim();

    const vagasRaw = window.prompt(
      `Quantas vagas o livro "${nome}" tem? (deixe em branco se não quiser controlar vagas)`
    );
    let vagas: number | null = null;
    if (vagasRaw !== null && vagasRaw.trim() !== "") {
      const parsed = Number(vagasRaw.trim());
      if (!Number.isFinite(parsed) || parsed < 0) {
        window.alert("Número de vagas inválido — nada foi salvo.");
        return;
      }
      vagas = parsed;
    }

    setCadastrandoLivro(true);
    try {
      const res = await fetch("/api/livros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, vagas }),
      });
      if (!res.ok) throw new Error("falha ao cadastrar livro");
      setLivroCatalog((prev) => {
        const existing = prev.some((l) => l.nome.toLowerCase() === nome.toLowerCase());
        if (existing) {
          return prev.map((l) => (l.nome.toLowerCase() === nome.toLowerCase() ? { nome, vagas } : l));
        }
        return [...prev, { nome, vagas }];
      });
    } catch {
      window.alert("Não consegui cadastrar o livro, tenta de novo.");
    } finally {
      setCadastrandoLivro(false);
    }
  }

  // Painel de vagas: só aparece quando um livro específico está selecionado
  // no filtro. "Preenchidas" conta TODAS as vendas com esse livro (não só as
  // que passam pelos outros filtros), pra refletir a ocupação real.
  const livroSelecionadoInfo = useMemo(() => {
    if (!livroFilter) return null;
    const catalogEntry = livroCatalog.find(
      (l) => l.nome.toLowerCase() === livroFilter.toLowerCase()
    );
    const dealsDoLivro = dealsState.filter((d) => d.livro === livroFilter);
    const preenchidas = dealsDoLivro.length;
    const vagas = catalogEntry?.vagas ?? null;
    const faltam = vagas !== null ? Math.max(0, vagas - preenchidas) : null;
    const valorTotal = dealsDoLivro.reduce((acc, d) => acc + d.valor, 0);

    const porCloserMap = new Map<string, number>();
    for (const d of dealsDoLivro) {
      const key = d.closer || "Sem closer";
      porCloserMap.set(key, (porCloserMap.get(key) || 0) + 1);
    }
    const porCloser = [...porCloserMap.entries()].sort((a, b) => b[1] - a[1]);

    return { vagas, preenchidas, faltam, valorTotal, porCloser };
  }, [livroFilter, livroCatalog, dealsState]);

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
          <button
            onClick={cadastrarLivro}
            disabled={cadastrandoLivro}
            className="rounded-lg border border-dashed border-brand-400 px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-500/5 disabled:opacity-60"
          >
            {cadastrandoLivro ? "Cadastrando..." : "+ Cadastrar livro"}
          </button>
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

        {livroSelecionadoInfo ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Vagas</div>
              <div className="text-lg font-semibold text-ink">
                {livroSelecionadoInfo.vagas ?? "não definidas"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Preenchidas</div>
              <div className="text-lg font-semibold text-ink">{livroSelecionadoInfo.preenchidas}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Faltam</div>
              <div className="text-lg font-semibold text-ink">
                {livroSelecionadoInfo.faltam ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Valor total</div>
              <div className="text-lg font-semibold text-ink">
                {formatBRL(livroSelecionadoInfo.valorTotal)}
              </div>
            </div>
            {livroSelecionadoInfo.porCloser.length > 0 ? (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted">Por closer</div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {livroSelecionadoInfo.porCloser.map(([closer, count]) => (
                    <span
                      key={closer}
                      className="rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-brand-700"
                    >
                      {closer} ({count})
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Vendas deste mês ({currentMonthDeals.length})
        </h3>
        <DealsTableGrid
          deals={currentMonthDeals}
          onToggle={toggleSimonato}
          savingRow={savingRow}
          errorRow={errorRow}
          livroOptions={livroOptions}
          onLivroChange={updateLivro}
          savingLivroRow={savingLivroRow}
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
                    onToggle={toggleSimonato}
                    savingRow={savingRow}
                    errorRow={errorRow}
                    livroOptions={livroOptions}
                    onLivroChange={updateLivro}
                    savingLivroRow={savingLivroRow}
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
  onToggle,
  savingRow,
  errorRow,
  livroOptions,
  onLivroChange,
  savingLivroRow,
  emptyLabel = "Nenhuma venda encontrada.",
}: {
  deals: Deal[];
  onToggle: (rowNumber: number, next: "OK" | "-") => void;
  savingRow: number | null;
  errorRow: number | null;
  livroOptions: string[];
  onLivroChange: (rowNumber: number, livro: string) => void;
  savingLivroRow: number | null;
  emptyLabel?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl2 border border-border bg-card shadow-card">
      <div className="max-h-[560px] overflow-y-auto">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[8%]" />
            <col className="w-[13%]" />
            <col className="w-[13%]" />
            <col className="w-[14%]" />
            <col className="w-[8%]" />
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[15%]" />
            <col className="w-[7%]" />
            <col className="w-[4%]" />
          </colgroup>
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-3">Fechamento</th>
              <th className="px-3 py-3">Livro</th>
              <th className="px-3 py-3">Coautor</th>
              <th className="px-3 py-3">Entregável</th>
              <th className="px-3 py-3 text-right">Valor</th>
              <th className="px-3 py-3">Squad</th>
              <th className="px-3 py-3">Closer</th>
              <th className="px-3 py-3">Contato</th>
              <th className="px-3 py-3">Double-check</th>
              <th className="px-3 py-3">Pipe</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => {
              const isOk = d.simonato.toUpperCase() === "OK";
              const isSaving = savingRow === d.rowNumber;
              const hasError = errorRow === d.rowNumber;
              const isSavingLivro = savingLivroRow === d.rowNumber;
              return (
                <tr key={d.rowNumber} className="border-b border-border/60 align-top last:border-0">
                  <td className="break-words px-3 py-3 text-muted">{d.dataFechamento || "—"}</td>
                  <td className="px-3 py-3">
                    <select
                      value={d.livro || ""}
                      disabled={isSavingLivro}
                      onChange={(e) => onLivroChange(d.rowNumber, e.target.value)}
                      className="w-full rounded-lg border border-border bg-transparent px-2 py-1.5 text-sm outline-none focus:border-brand-500 disabled:opacity-60"
                    >
                      <option value="">Selecionar...</option>
                      {livroOptions.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="break-words px-3 py-3 font-medium text-ink">{d.nomeCoautor}</td>
                  <td className="break-words px-3 py-3 text-muted">{d.entregaveis}</td>
                  <td className="break-words px-3 py-3 text-right tabular-nums">
                    {formatBRL(d.valor)}
                  </td>
                  <td className="break-words px-3 py-3 text-muted">{d.squad || "—"}</td>
                  <td className="break-words px-3 py-3 text-muted">{d.closer || "—"}</td>
                  <td className="break-words px-3 py-3 text-muted">
                    <div className="flex flex-col gap-0.5">
                      {d.celular ? (
                        <a href={`tel:${d.celular}`} className="truncate hover:text-ink">
                          {d.celular}
                        </a>
                      ) : null}
                      {d.email ? (
                        <a href={`mailto:${d.email}`} className="truncate hover:text-ink">
                          {d.email}
                        </a>
                      ) : null}
                      {d.linkedin ? (
                        <a
                          href={d.linkedin.startsWith("http") ? d.linkedin : `https://${d.linkedin}`}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-brand-600 hover:text-brand-700"
                        >
                          LinkedIn
                        </a>
                      ) : null}
                      {!d.celular && !d.email && !d.linkedin ? "—" : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {isOk ? (
                      <button
                        onClick={() => onToggle(d.rowNumber, "-")}
                        disabled={isSaving}
                        title="Clique para desmarcar"
                        className="rounded-full bg-accent-teal/10 px-2.5 py-1 text-xs font-medium text-accent-teal transition hover:bg-accent-teal/20 disabled:opacity-60"
                      >
                        {isSaving ? "..." : "OK"}
                      </button>
                    ) : (
                      <button
                        onClick={() => onToggle(d.rowNumber, "OK")}
                        disabled={isSaving}
                        className="rounded-full bg-accent-amber/10 px-2.5 py-1 text-xs font-medium text-accent-amber transition hover:bg-accent-amber/20 disabled:opacity-60"
                      >
                        {isSaving ? "Salvando..." : "Marcar OK"}
                      </button>
                    )}
                    {hasError ? (
                      <div className="mt-1 text-xs text-accent-coral">Erro, tente de novo</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
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
                <td colSpan={10} className="px-4 py-10 text-center text-muted">
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
