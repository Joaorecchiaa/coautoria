"use client";

import { useRef, useState } from "react";
import type { Deal } from "@/lib/metrics";
import { buildDashboardMetrics, formatBRL } from "@/lib/metrics";
import { StatCard } from "./StatCard";
import { DealsTable } from "./DealsTable";

// Junta os cards do topo com a tabela num componente cliente só, pra poder
// compartilhar estado entre eles: clicar no card "Pendentes de double-check"
// ativa exatamente o mesmo filtro do checkbox "Só pendentes de double-check"
// dentro da tabela, e rola a página até ela.
export function DashboardContent({ deals }: { deals: Deal[] }) {
  const metrics = buildDashboardMetrics(deals);
  const [pendentesSignal, setPendentesSignal] = useState(0);
  const tableRef = useRef<HTMLDivElement | null>(null);

  function handlePendentesClick() {
    setPendentesSignal((n) => n + 1);
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total de vendas" value={String(metrics.totalCount)} />
        <StatCard label="Valor total" value={formatBRL(metrics.totalValue)} />
        <StatCard
          label="Pendentes de double-check"
          value={String(metrics.pendentesDoubleCheck)}
          hint="Coluna SIMONATO ainda sem &quot;OK&quot; — clique para ver a lista"
          tone={metrics.pendentesDoubleCheck > 0 ? "warning" : "default"}
          onClick={handlePendentesClick}
        />
      </section>

      <section ref={tableRef} className="mb-10 scroll-mt-6">
        <DealsTable deals={deals} pendentesSignal={pendentesSignal} />
      </section>
    </>
  );
}
