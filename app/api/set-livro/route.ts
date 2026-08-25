import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { setLivro } from "@/lib/sheets";

export const dynamic = "force-dynamic";

// POST: define o livro (coluna B) de uma venda específica na planilha.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rowNumber = Number(body?.rowNumber);
    const livro = String(body?.livro ?? "").trim();

    if (!rowNumber) {
      return NextResponse.json({ error: "rowNumber inválido" }, { status: 400 });
    }

    await setLivro(rowNumber, livro);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Erro ao salvar livro:", err);
    return NextResponse.json({ error: err?.message || "erro desconhecido" }, { status: 500 });
  }
}
