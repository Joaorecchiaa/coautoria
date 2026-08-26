"use client";

import { useMemo, useState } from "react";
import type { Deal } from "@/lib/metrics";
import { buildDashboardMetrics, buildLivroInsights } from "@/lib/metrics";
import { StatCard } from "./StatCard";
import { TimelineChart } from "./TimelineChart";
import { RankingChart } from "./RankingChart";

function parseDateFlexible(dateStr: string): Date | null {
  if (!dateStr) return null;
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const br = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  return null;
}

// Filtro de livro pra página inteira de Insights: escolhe um livro e tudo
// reage — os cards, a evolução mensal e os rankings por closer/squad, todos
// recalculados só com as vendas daquele livro.
export function InsightsContent({ deals }: { deals: Deal[] }) {
  const livroOptions = useMemo(() => {
    const set = new Set(deals.map((d) => d.livro).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [deals]);

  const [livroFilter, setLivroFilter] = useState("");

  const filteredDeals = useMemo(
    () => (livroFilter ? deals.filter((d) => d.livro === livroFilter) : deals),
    [deals, livroFilter]
  );

  const metrics = useMemo(() => buildDashboardMetrics(filteredDeals), [filteredDeals]);
  const livroInsights = useMemo(() => buildLivroInsights(filteredDeals), [filteredDeals]);

  const tempoVendido = useMemo(() => {
    if (!livroFilter || !filteredDeals.length) return null;
    const datas = filteredDeals.map((d) => d.dataFechamento).filter(Boolean).sort();
    const primeira = datas[0];
    const ultima = datas[datas.length - 1];
    if (!primeira || !ultima) return null;
    const da = parseDateFlexible(primeira);
    const db = parseDateFlexible(ultima);
    const dias =
      da && db ? Math.max(0, Math.round((db.getTime() - da.getTime()) / 86400000)) : null;
    return { primeira, ultima, dias };
  }, [livroFilter, filteredDeals]);

  return (
    <div>
      <div className="mb-8 rounded-xl2 border border-border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-muted">Filtrar por livro:</label>
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
          {tempoVendido ? (
            <span className="text-sm text-muted">
              de {tempoVendido.primeira} até {tempoVendido.ultima}
              {tempoVendido.dias !== null
                ? ` (${tempoVendido.dias} dia${tempoVendido.dias === 1 ? "" : "s"})`
                : ""}
            </span>
          ) : null}
          <span className="ml-auto text-sm text-muted">{filteredDeals.length} vendas consideradas</span>
        </div>
      </div>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Livro com mais vendas"
          value={livroInsights.livroMaisVendas?.livro || "—"}
          hint={
            livroInsights.livroMaisVendas
              ? `${livroInsights.livroMaisVendas.count} venda(s)`
              : "Nenhuma venda com livro definido ainda"
          }
        />
        <StatCard
          label="Livro que vendeu mais rápido"
          value={livroInsights.livroMaisRapido?.livro || "—"}
          hint={
            livroInsights.livroMaisRapido
              ? `${livroInsights.livroMaisRapido.vendasPorDia!.toFixed(2)} venda(s) por dia, em média`
              : "Precisa de pelo menos 2 vendas com data pra medir o ritmo"
          }
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Evolução mensal
        </h2>
        <div className="rounded-xl2 border border-border bg-card p-5 shadow-card">
          <TimelineChart data={metrics.byMonth} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Por Closer
          </h2>
          <div className="rounded-xl2 border border-border bg-card p-5 shadow-card">
            <RankingChart data={metrics.byCloser} color="#3d6dfb" />
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Por Squad
          </h2>
          <div className="rounded-xl2 border border-border bg-card p-5 shadow-card">
            <RankingChart data={metrics.bySquad} color="#0f9d8c" />
          </div>
        </div>
      </section>
    </div>
  );
}
