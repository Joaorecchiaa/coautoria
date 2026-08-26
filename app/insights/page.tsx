import { getSheetRows } from "@/lib/sheets";
import { parseDeals } from "@/lib/metrics";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardNav } from "@/components/DashboardNav";
import { InsightsContent } from "@/components/InsightsContent";

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

  return (
    <main>
      <DashboardHeader updatedAt={new Date()} />
      <DashboardNav />

      <div className="mx-auto max-w-[1600px] px-6 py-8">
        {loadError ? (
          <div className="mb-8 rounded-xl2 border border-accent-coral/30 bg-accent-coral/5 p-4 text-sm text-accent-coral">
            {loadError}
          </div>
        ) : null}

        <InsightsContent deals={deals} />
      </div>
    </main>
  );
}
