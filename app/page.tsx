import { getSheetRows } from "@/lib/sheets";
import { buildDashboardMetrics, buildLivroInsights, parseDeals } from "@/lib/metrics";
import { StatCard } from "@/components/StatCard";
import { RankingChart } from "@/components/RankingChart";
import { TimelineChart } from "@/components/TimelineChart";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardNav } from "@/components/DashboardNav";

export const revalidate = 300;

export default async function InsightsPage() {
  let deals: ReturnType<typeof parseDeals> = [];
  let loadError: string | null = null;

  try {
    const rows = await getSheetRows();
    deals = parseDeals(rows);
  } catch (err: any) {
    loadError = err?.message || "Não foi possível carregar a planilha.";
  }

  const metrics = buildDashboardMetrics(deals);
  const livroInsights = buildLivroInsights(deals);

  return (
    <main>
      <DashboardHeader updatedAt={new Date()} />
      <DashboardNav current="insights" />

      <div className="mx-auto max-w-[1600px] px-6 py-8">
        {loadError ? (
          <div className="mb-8 rounded-xl2 border border-accent-coral/30 bg-accent-coral/5 p-4 text-sm text-accent-coral">
            {loadError}
          </div>
        ) : null}

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
    </main>
  );
}
