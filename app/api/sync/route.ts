import { NextResponse } from "next/server";
import {
  FIELD_KEYS,
  getDealFieldOptionMaps,
  getDealFull,
  getPipelineName,
  getUserName,
  labelFor,
  searchWonCoautoriaDealIds,
} from "@/lib/pipedrive";
import { appendRows, getSheetRows } from "@/lib/sheets";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function extractDealIdsFromSheet(rows: string[][]): Set<number> {
  const ids = new Set<number>();
  for (const row of rows) {
    const pipe = row[7] || ""; // coluna H
    for (const m of String(pipe).matchAll(/\/deal\/(\d+)/g)) {
      ids.add(Number(m[1]));
    }
  }
  return ids;
}

function ownerName(deal: Record<string, any>): Promise<string> | string {
  const owner = deal.owner_id;
  if (owner && typeof owner === "object" && owner.name) return owner.name as string;
  if (owner) return getUserName(typeof owner === "object" ? owner.value : owner);
  return "";
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const [existingRows, candidateIds, optionMaps] = await Promise.all([
      getSheetRows(),
      searchWonCoautoriaDealIds(),
      getDealFieldOptionMaps(),
    ]);

    const existingIds = extractDealIdsFromSheet(existingRows);
    const newIds = candidateIds.filter((id) => !existingIds.has(id));

    const nomeProdutoMap = optionMaps[FIELD_KEYS.nomeProduto];
    const bonusProdutoMap = optionMaps[FIELD_KEYS.bonusProduto];

    const newRows: (string | number)[][] = [];
    const skippedFalsePositive: number[] = [];

    for (const id of newIds) {
      const deal = await getDealFull(id);
      if (!deal) continue;

      const nomeProdutoLabel = labelFor(nomeProdutoMap, deal[FIELD_KEYS.nomeProduto]);
      const bonusProdutoLabel = labelFor(bonusProdutoMap, deal[FIELD_KEYS.bonusProduto]);

      const temCoautoriaNome = nomeProdutoLabel.toUpperCase().includes("COAUTORIA");
      const temCoautoriaBonus = bonusProdutoLabel.toUpperCase().includes("COAUTORIA");

      if (!temCoautoriaNome && !temCoautoriaBonus) {
        // A busca do Pipedrive pode ter encontrado o termo em outro campo (nota, etc).
        // Só entram na planilha negócios que realmente têm COAUTORIA em Nome Produto ou Bônus - Produto.
        skippedFalsePositive.push(id);
        continue;
      }

      const wonDate = (deal.won_time || deal.close_time || "").slice(0, 10);
      const closer = await ownerName(deal);
      const squad = deal.pipeline_id ? await getPipelineName(deal.pipeline_id) : "";

      newRows.push([
        wonDate, // A - Data Inclusao
        "", // B - LIVRO (preenchimento manual)
        "-", // C - SIMONATO (pendente de double-check manual)
        deal.title || "", // D - Nome Coautor
        wonDate, // E - Data Fechamento
        nomeProdutoLabel, // F - Entregaveis (texto exato de Nome Produto)
        deal.value ?? "", // G - Valor
        `https://boardacademy.pipedrive.com/deal/${id}`, // H - Pipe
        String(deal[FIELD_KEYS.celular] ?? ""), // I - Celular
        String(deal[FIELD_KEYS.email] ?? ""), // J - E-mail
        String(deal[FIELD_KEYS.linkedin] ?? ""), // K - LinkedIn
        squad, // L - Squad (nome do funil)
        closer, // M - Closer (dono da venda)
        "", // N - Tema Livro (preenchimento manual)
        "", // O - OBS (preenchimento manual)
      ]);
    }

    if (newRows.length) {
      await appendRows(newRows);
    }

    return NextResponse.json({
      candidatosEncontrados: candidateIds.length,
      jaExistiamNaPlanilha: candidateIds.length - newIds.length,
      novosAdicionados: newRows.length,
      descartadosFalsoPositivo: skippedFalsePositive,
    });
  } catch (err: any) {
    console.error("Erro na sincronização:", err);
    return NextResponse.json({ error: err?.message || "erro desconhecido" }, { status: 500 });
  }
}
