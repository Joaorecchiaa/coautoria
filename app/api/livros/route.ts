import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getLivrosCatalog, getSheetRows, upsertLivroCatalog } from "@/lib/sheets";

export const dynamic = "force-dynamic";

// GET: devolve a lista de livros disponíveis (nome + vagas, quando definidas)
// pro dropdown e pro painel de vagas — junta o catálogo cadastrado (colunas
// Q/R) com os nomes de livro que já aparecem em vendas antigas (coluna B),
// pra não perder nada que já foi usado antes de existir esse catálogo. Livros
// que só existem por causa de vendas antigas entram com vagas: null.
export async function GET() {
  try {
    const [catalog, rows] = await Promise.all([getLivrosCatalog(), getSheetRows()]);
    const fromDeals = rows.map((r) => (r[1] || "").trim()).filter(Boolean);

    const byKey = new Map<string, { nome: string; vagas: number | null }>();
    for (const entry of catalog) {
      byKey.set(entry.nome.toLowerCase(), { nome: entry.nome, vagas: entry.vagas });
    }
    for (const nome of fromDeals) {
      const key = nome.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, { nome, vagas: null });
    }

    const livros = [...byKey.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    return NextResponse.json({ livros });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "erro desconhecido" }, { status: 500 });
  }
}

// POST: cadastra um livro novo no catálogo, ou atualiza o número de vagas se
// o nome já existir (case-insensitive).
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nome = String(body?.nome || "").trim();
    const vagasRaw = body?.vagas;
    const vagas =
      vagasRaw === null || vagasRaw === undefined || vagasRaw === ""
        ? null
        : Number(vagasRaw);

    if (!nome) {
      return NextResponse.json({ error: "nome do livro vazio" }, { status: 400 });
    }
    if (vagas !== null && (!Number.isFinite(vagas) || vagas < 0)) {
      return NextResponse.json({ error: "número de vagas inválido" }, { status: 400 });
    }

    const result = await upsertLivroCatalog(nome, vagas);

    revalidatePath("/");
    return NextResponse.json({ ok: true, nome, vagas, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "erro desconhecido" }, { status: 500 });
  }
}
