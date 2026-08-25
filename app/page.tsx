import { getSheetRows } from "@/lib/sheets";
import { buildDashboardMetrics, formatBRL, parseDeals } from "@/lib/metrics";
import { StatCard } from "@/components/StatCard";
import { RankingChart } from "@/components/RankingChart";
import { TimelineChart } from "@/components/TimelineChart";
import { DealsTable } from "@/components/DealsTable";

export const revalidate = 300; // atualiza a página a cada 5 minutos

export default async function DashboardPage() {
  let deals: ReturnType<typeof parseDeals> = [];
  let loadError: string | null = null;

  try {
    const rows = await getSheetRows();
    deals = parseDeals(rows);
  } catch (err: any) {
    loadError = err?.message || "Não foi possível carregar a planilha.";
  }

  const metrics = buildDashboardMetrics(deals);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Dashboard de Coautorias</h1>
        <p className="mt-1 text-sm text-muted">
          Vendas com COAUTORIA identificadas no Pipedrive, sincronizadas diariamente com a
          planilha de backlog.
        </p>
      </header>

      {loadError ? (
        <div className="mb-8 rounded-xl2 border border-accent-coral/30 bg-accent-coral/5 p-4 text-sm text-accent-coral">
          {loadError}
        </div>
      ) : null}

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total de vendas" value={String(metrics.totalCount)} />
        <StatCard label="Valor total" value={formatBRL(metrics.totalValue)} />
        <StatCard
          label="Pendentes de double-check"
          value={String(metrics.pendentesDoubleCheck)}
          hint="Coluna SIMONATO ainda sem &quot;OK&quot;"
          tone={metrics.pendentesDoubleCheck > 0 ? "warning" : "default"}
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

      <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
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

      <section>
        <DealsTable deals={deals} />
      </section>
    </main>
  );
}
