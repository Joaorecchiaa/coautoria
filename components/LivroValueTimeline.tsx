"use client";

import { useMemo, useState } from "react";
import type { Deal } from "@/lib/metrics";
import { monthKeyOf } from "@/lib/metrics";
import { TimelineChart } from "./TimelineChart";

function parseDateFlexible(dateStr: string): Date | null {
  if (!dateStr) return null;
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const br = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  return null;
}

// Igual ao filtro de livro da tabela do dashboard — escolhe um livro e vê a
// evolução mensal do valor vendido dele, além de quanto tempo levou pra
// vender (da primeira à última venda registrada).
export function LivroValueTimeline({ deals }: { deals: Deal[] }) {
  const livroOptions = useMemo(() => {
    const set = new Set(deals.map((d) => d.livro).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [deals]);

  const [livro, setLivro] = useState("");

  const dealsDoLivro = useMemo(
    () => (livro ? deals.filter((d) => d.livro === livro) : []),
    [deals, livro]
  );

  const byMonth = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    for (const d of dealsDoLivro) {
      const key = monthKeyOf(d);
      if (!key) continue;
      const cur = map.get(key) || { count: 0, value: 0 };
      cur.count += 1;
      cur.value += d.valor;
      map.set(key, cur);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v }));
  }, [dealsDoLivro]);

  const tempoVendido = useMemo(() => {
    if (!dealsDoLivro.length) return null;
    const datas = dealsDoLivro.map((d) => d.dataFechamento).filter(Boolean).sort();
    const primeira = datas[0];
    const ultima = datas[datas.length - 1];
    if (!primeira || !ultima) return null;
    const da = parseDateFlexible(primeira);
    const db = parseDateFlexible(ultima);
    const dias = da && db ? Math.max(0, Math.round((db.getTime() - da.getTime()) / 86400000)) : null;
    return { primeira, ultima, dias };
  }, [dealsDoLivro]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={livro}
          onChange={(e) => setLivro(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-500"
        >
          <option value="">Selecionar livro...</option>
          {livroOptions.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        {tempoVendido ? (
          <span className="text-sm text-muted">
            {dealsDoLivro.length} venda(s) — de {tempoVendido.primeira} até {tempoVendido.ultima}
            {tempoVendido.dias !== null ? ` (${tempoVendido.dias} dia${tempoVendido.dias === 1 ? "" : "s"})` : ""}
          </span>
        ) : null}
      </div>

      {!livro ? (
        <div className="py-14 text-center text-sm text-muted">
          Selecione um livro pra ver a evolução do valor vendido e o tempo de venda dele.
        </div>
      ) : byMonth.length > 0 ? (
        <TimelineChart data={byMonth} />
      ) : (
        <div className="py-14 text-center text-sm text-muted">
          Nenhuma venda com data registrada pra esse livro ainda.
        </div>
      )}
    </div>
  );
}
