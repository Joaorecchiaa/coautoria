import { getSheetRows } from "@/lib/sheets";
import { buildDashboardMetrics, formatBRL, parseDeals } from "@/lib/metrics";
import { StatCard } from "@/components/StatCard";
import { DealsTable } from "@/components/DealsTable";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardNav } from "@/components/DashboardNav";

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
    <main>
      <DashboardHeader updatedAt={new Date()} />
      <DashboardNav current="dashboard" />

      <div className="mx-auto max-w-[1600px] px-6 py-8">
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

        <section className="mb-10">
          <DealsTable deals={deals} />
        </section>
      </div>
    </main>
  );
}
