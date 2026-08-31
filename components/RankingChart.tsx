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

type Row = { name: string; count: number; value: number };

// Tooltip customizado: mostra o valor em R$ e o número de vendas juntos,
// no mesmo quadradinho, independente de qual métrica dimensiona as barras.
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload as Row;
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
      <div style={{ color: "#111827", fontWeight: 500 }}>{row.name}</div>
      <div style={{ color: "#3d6dfb" }}>Valor: {formatBRL(row.value)}</div>
      <div style={{ color: "#0f9d8c" }}>
        Vendas: {row.count} venda{row.count === 1 ? "" : "s"}
      </div>
    </div>
  );
}

export function RankingChart({
  data,
  color,
  metric = "value",
}: {
  data: Row[];
  color: string;
  metric?: "value" | "count";
}) {
  const top = [...data].slice(0, 10).reverse();

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, top.length * 34)}>
      <BarChart data={top} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: "#6b7280" }}
          tickFormatter={(v) => (metric === "value" ? formatBRL(v) : String(v))}
          axisLine={{ stroke: "#e4e7ec" }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tick={{ fontSize: 12, fill: "#14171f" }}
          axisLine={{ stroke: "#e4e7ec" }}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey={metric} fill={color} radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
