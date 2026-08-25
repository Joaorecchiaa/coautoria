import { NextResponse } from "next/server";
import { searchWonCoautoriaDealIds } from "@/lib/pipedrive";
import { extractDealIdsFromSheet, processDealForSheet } from "@/lib/coautoria";
import { appendRows, getSheetRows } from "@/lib/sheets";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Rede de segurança: roda uma vez por dia (via Vercel Cron, ver vercel.json) e
// varre TODOS os negócios ganhos com "COAUTORIA" no Pipedrive, garantindo que
// nada passou batido — mesmo que o webhook em tempo real (/api/webhook/pipedrive)
// tenha falhado em algum momento.
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const [existingRows, candidateIds] = await Promise.all([
      getSheetRows(),
      searchWonCoautoriaDealIds(),
    ]);

    const existingIds = extractDealIdsFromSheet(existingRows);
    const newRows: (string | number)[][] = [];
    const skipped: Record<string, number[]> = {
      not_coautoria: [],
      not_won: [],
      not_found: [],
    };

    for (const id of candidateIds) {
      if (existingIds.has(id)) continue;
      const result = await processDealForSheet(id, existingIds);
      if (result.status === "added") {
        newRows.push(result.row);
      } else if (result.status !== "already_exists") {
        skipped[result.status]?.push(id);
      }
    }

    if (newRows.length) {
      await appendRows(newRows);
    }

    return NextResponse.json({
      candidatosEncontrados: candidateIds.length,
      novosAdicionados: newRows.length,
      ignorados: skipped,
    });
  } catch (err: any) {
    console.error("Erro na sincronização:", err);
    return NextResponse.json({ error: err?.message || "erro desconhecido" }, { status: 500 });
  }
}
