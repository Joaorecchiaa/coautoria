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
        <Tooltip
          formatter={(v: number) =>
            metric === "value" ? formatBRL(v) : `${v} venda(s)`
          }
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e4e7ec",
            fontSize: 13,
          }}
        />
        <Bar dataKey={metric} fill={color} radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
