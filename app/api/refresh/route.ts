import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { extractDealIdsFromSheet, processWonDealsSince } from "@/lib/coautoria";
import { toPipedriveDateTime } from "@/lib/pipedrive";
import { appendRows, getSheetRows } from "@/lib/sheets";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Quantos dias pra trás olhar: o histórico antigo já está na planilha, então
// só precisamos pegar o que ganhou/mudou recentemente. 45 dias dá uma margem
// de segurança confortável (cobre o mês atual e o anterior) sem varrer o
// histórico todo — é isso que deixa o botão "Atualizar" rápido.
const LOOKBACK_DAYS = 45;

// Rota "Atualizar" chamada pelo botão do dashboard: busca só os negócios
// ganhos/atualizados recentemente no Pipedrive, na hora que o usuário pedir.
// Não exige o CRON_SECRET porque é disparada pelo próprio time direto do
// dashboard.
export async function POST() {
  try {
    const sinceISO = toPipedriveDateTime(
      new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    );

    const existingRows = await getSheetRows();
    const existingIds = extractDealIdsFromSheet(existingRows);
    const { newRows, consideredCount, titleUpdates } = await processWonDealsSince(
      sinceISO,
      existingIds
    );

    if (newRows.length) {
      await appendRows(newRows);
    }

    revalidatePath("/");

    return NextResponse.json({
      candidatosConsiderados: consideredCount,
      novosAdicionados: newRows.length,
      titulosAtualizados: titleUpdates,
      janelaDias: LOOKBACK_DAYS,
    });
  } catch (err: any) {
    console.error("Erro ao atualizar:", err);
    return NextResponse.json({ error: err?.message || "erro desconhecido" }, { status: 500 });
  }
}
