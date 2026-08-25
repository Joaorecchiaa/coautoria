import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { addLivroToCatalog, getLivrosCatalog, getSheetRows } from "@/lib/sheets";

export const dynamic = "force-dynamic";

// GET: devolve a lista de livros disponíveis pro dropdown — junta o catálogo
// cadastrado (coluna Q) com os nomes de livro que já aparecem em vendas
// antigas (coluna B), pra não perder nada que já foi usado antes de existir
// esse catálogo.
export async function GET() {
  try {
    const [catalog, rows] = await Promise.all([getLivrosCatalog(), getSheetRows()]);
    const fromDeals = rows.map((r) => (r[1] || "").trim()).filter(Boolean);

    const seen = new Map<string, string>(); // chave em minúsculo -> nome original
    for (const nome of [...catalog, ...fromDeals]) {
      const key = nome.toLowerCase();
      if (!seen.has(key)) seen.set(key, nome);
    }

    const livros = [...seen.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
    return NextResponse.json({ livros });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "erro desconhecido" }, { status: 500 });
  }
}

// POST: cadastra um livro novo no catálogo (coluna Q), se ainda não existir.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nome = String(body?.nome || "").trim();
    if (!nome) {
      return NextResponse.json({ error: "nome do livro vazio" }, { status: 400 });
    }

    const catalog = await getLivrosCatalog();
    const jaExiste = catalog.some((l) => l.toLowerCase() === nome.toLowerCase());
    if (!jaExiste) {
      await addLivroToCatalog(nome);
    }

    revalidatePath("/");
    return NextResponse.json({ ok: true, nome, jaExistia: jaExiste });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "erro desconhecido" }, { status: 500 });
  }
}
