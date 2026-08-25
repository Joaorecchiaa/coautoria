import type { SheetRow } from "./sheets";

export type Deal = {
  rowNumber: number; // número da linha na planilha (2 = primeira venda)
  dataInclusao: string;
  livro: string;
  simonato: string;
  nomeCoautor: string;
  dataFechamento: string;
  entregaveis: string;
  valor: number;
  pipe: string;
  celular: string;
  email: string;
  linkedin: string;
  squad: string;
  closer: string;
  temaLivro: string;
  obs: string;
};

export function parseDeals(rows: SheetRow[]): Deal[] {
  return rows
    .map((r, i) => ({ r, rowNumber: i + 2 })) // linha 1 = cabeçalho
    .filter(({ r }) => (r[3] || "").trim() !== "") // precisa ter Nome Coautor
    .map(({ r, rowNumber }) => ({
      rowNumber,
      dataInclusao: r[0] || "",
      livro: r[1] || "",
      simonato: (r[2] || "").trim(),
      nomeCoautor: r[3] || "",
      dataFechamento: r[4] || "",
      entregaveis: r[5] || "",
      valor: parseValor(r[6]),
      pipe: r[7] || "",
      celular: r[8] || "",
      email: r[9] || "",
      linkedin: r[10] || "",
      squad: r[11] || "",
      closer: r[12] || "",
      temaLivro: r[13] || "",
      obs: r[14] || "",
    }));
}

function parseValor(raw: string | undefined): number {
  if (!raw) return 0;
  const n = Number(String(raw).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function monthKeyOf(deal: Pick<Deal, "dataFechamento" | "dataInclusao">): string | null {
  return monthKey(deal.dataFechamento) || monthKey(deal.dataInclusao);
}

function monthKey(dateStr: string): string | null {
  if (!dateStr) return null;
  const m = dateStr.match(/(\d{4})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}`;
  const br = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}`;
  return null;
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const idx = Number(month) - 1;
  return `${MONTH_NAMES[idx] ?? month} de ${year}`;
}

export function buildDashboardMetrics(deals: Deal[]) {
  const totalCount = deals.length;
  const totalValue = deals.reduce((acc, d) => acc + d.valor, 0);
  const pendentesDoubleCheck = deals.filter((d) => d.simonato.toUpperCase() !== "OK").length;

  const byCloser = groupBy(deals, (d) => d.closer || "Sem closer");
  const bySquad = groupBy(deals, (d) => d.squad || "Sem squad");

  const byMonthMap = new Map<string, { count: number; value: number }>();
  for (const d of deals) {
    const key = monthKeyOf(d);
    if (!key) continue;
    const cur = byMonthMap.get(key) || { count: 0, value: 0 };
    cur.count += 1;
    cur.value += d.valor;
    byMonthMap.set(key, cur);
  }
  const byMonth = [...byMonthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));

  return {
    totalCount,
    totalValue,
    pendentesDoubleCheck,
    byCloser: toSortedArray(byCloser),
    bySquad: toSortedArray(bySquad),
    byMonth,
  };
}

function groupBy(deals: Deal[], keyFn: (d: Deal) => string) {
  const map = new Map<string, { count: number; value: number }>();
  for (const d of deals) {
    const key = keyFn(d);
    const cur = map.get(key) || { count: 0, value: 0 };
    cur.count += 1;
    cur.value += d.valor;
    map.set(key, cur);
  }
  return map;
}

function toSortedArray(map: Map<string, { count: number; value: number }>) {
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.value - a.value);
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}
