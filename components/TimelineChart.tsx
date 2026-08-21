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

export function TimelineChart({ data }: { data: Row[] }) {
  const formatted = data.map((d) => ({ ...d, label: formatMonth(d.month) }));

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
          tickFormatter={(v) => formatBRL(v)}
          axisLine={{ stroke: "#e4e7ec" }}
          tickLine={false}
          width={80}
        />
        <Tooltip
          formatter={(v: number, name) =>
            name === "value" ? formatBRL(v) : `${v} venda(s)`
          }
          labelFormatter={(l) => `Mês: ${l}`}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e4e7ec",
            fontSize: 13,
          }}
        />
        <Bar dataKey="value" fill="#3d6dfb" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
