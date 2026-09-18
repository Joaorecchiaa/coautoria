import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { setObs } from "@/lib/sheets";

export const dynamic = "force-dynamic";

// POST: define a observação (coluna O) de uma venda específica na planilha.
// Não trima o texto inteiro pra não atrapalhar quem está digitando com
// espaços/quebras de linha intencionais.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rowNumber = Number(body?.rowNumber);
    const obs = String(body?.obs ?? "");

    if (!rowNumber) {
      return NextResponse.json({ error: "rowNumber inválido" }, { status: 400 });
    }

    await setObs(rowNumber, obs);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Erro ao salvar observação:", err);
    return NextResponse.json({ error: err?.message || "erro desconhecido" }, { status: 500 });
  }
}
