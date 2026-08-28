import { NextResponse } from "next/server";
import { extractDealIdsFromSheet, processWonDealsSince } from "@/lib/coautoria";
import { toPipedriveDateTime } from "@/lib/pipedrive";
import { appendRows, getSheetRows } from "@/lib/sheets";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Rede de segurança: roda uma vez por dia (via Vercel Cron, ver vercel.json).
// Janela maior que o botão "Atualizar" (180 dias) só por segurança extra,
// caso o webhook e os cliques manuais tenham falhado por um bom tempo — o
// histórico mais antigo que isso já está garantido na planilha.
const LOOKBACK_DAYS = 180;

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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

    return NextResponse.json({
      candidatosConsiderados: consideredCount,
      novosAdicionados: newRows.length,
      titulosAtualizados: titleUpdates,
      janelaDias: LOOKBACK_DAYS,
    });
  } catch (err: any) {
    console.error("Erro na sincronização:", err);
    return NextResponse.json({ error: err?.message || "erro desconhecido" }, { status: 500 });
  }
}
