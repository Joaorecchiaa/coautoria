"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/lib/metrics";

type Row = { month: string; count: number; value: number };

function formatMonth(m: string) {
  const [year, month] = m.split("-");
  const names = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  const idx = Number(month) - 1;
  return `${names[idx] ?? month}/${year.slice(2)}`;
}

// Tooltip customizado: mostra o mês, o valor em R$ e o número de vendas,
// tudo dentro do mesmo quadradinho — independente de qual métrica está
// sendo exibida nas barras.
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload as Row & { label: string };
  return (
    <div
      style={{
        borderRadius: 8,
        border: "1px solid #e4e7ec",
        background: "#fff",
        padding: "8px 12px",
        fontSize: 13,
      }}
    >
      <div style={{ color: "#111827", fontWeight: 500 }}>Mês: {label}</div>
      <div style={{ color: "#3d6dfb" }}>Valor: {formatBRL(row.value)}</div>
      <div style={{ color: "#0f9d8c" }}>
        Vendas: {row.count} venda{row.count === 1 ? "" : "s"}
      </div>
    </div>
  );
}

// metric="value" (padrão): mostra o valor vendido em R$ por mês.
// metric="count": mostra a quantidade de vendas por mês, em números inteiros
// (1, 2, 3...), sem formatar como dinheiro.
export function TimelineChart({
  data,
  metric = "value",
}: {
  data: Row[];
  metric?: "value" | "count";
}) {
  const formatted = data.map((d) => ({ ...d, label: formatMonth(d.month) }));
  const dataKey = metric === "count" ? "count" : "value";
  const color = metric === "count" ? "#0f9d8c" : "#3d6dfb";

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={formatted} margin={{ left: 8, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "#6b7280" }}
          axisLine={{ stroke: "#e4e7ec" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#6b7280" }}
          tickFormatter={metric === "count" ? (v) => String(v) : (v) => formatBRL(v)}
          allowDecimals={metric !== "count"}
          axisLine={{ stroke: "#e4e7ec" }}
          tickLine={false}
          width={metric === "count" ? 40 : 80}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
