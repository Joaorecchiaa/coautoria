// Lógica compartilhada: dado um deal ganho no Pipedrive, decide se ele é uma
// venda de coautoria e monta a linha pronta para entrar na planilha.
// Usada tanto pelo cron diário (/api/sync) quanto pelo webhook em tempo real
// (/api/webhook/pipedrive).

import {
  FIELD_KEYS,
  getDealFieldOptionMaps,
  getDealFull,
  getPipelineName,
  getUserName,
  labelFor,
} from "./pipedrive";

export function extractDealIdsFromSheet(rows: string[][]): Set<number> {
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

export type ProcessResult =
  | { status: "added"; row: (string | number)[] }
  | { status: "already_exists" }
  | { status: "not_won" }
  | { status: "not_coautoria" }
  | { status: "not_found" };

/**
 * Processa um único negócio do Pipedrive: verifica se é uma venda de coautoria
 * ganha e ainda não registrada, e retorna a linha pronta para adicionar à
 * planilha (ou o motivo pelo qual foi ignorado).
 */
export async function processDealForSheet(
  dealId: number,
  existingIds: Set<number>
): Promise<ProcessResult> {
  if (existingIds.has(dealId)) {
    return { status: "already_exists" };
  }

  const deal = await getDealFull(dealId);
  if (!deal) return { status: "not_found" };

  if (deal.status !== "won") {
    return { status: "not_won" };
  }

  const optionMaps = await getDealFieldOptionMaps();
  const nomeProdutoMap = optionMaps[FIELD_KEYS.nomeProduto];
  const bonusProdutoMap = optionMaps[FIELD_KEYS.bonusProduto];

  const nomeProdutoLabel = labelFor(nomeProdutoMap, deal[FIELD_KEYS.nomeProduto]);
  const bonusProdutoLabel = labelFor(bonusProdutoMap, deal[FIELD_KEYS.bonusProduto]);

  const temCoautoriaNome = nomeProdutoLabel.toUpperCase().includes("COAUTORIA");
  const temCoautoriaBonus = bonusProdutoLabel.toUpperCase().includes("COAUTORIA");

  if (!temCoautoriaNome && !temCoautoriaBonus) {
    return { status: "not_coautoria" };
  }

  const wonDate = (deal.won_time || deal.close_time || "").slice(0, 10);
  const closer = await ownerName(deal);
  const squad = deal.pipeline_id ? await getPipelineName(deal.pipeline_id) : "";

  const row: (string | number)[] = [
    wonDate, // A - Data Inclusao
    "", // B - LIVRO (preenchimento manual)
    "-", // C - SIMONATO (pendente de double-check manual)
    deal.title || "", // D - Nome Coautor
    wonDate, // E - Data Fechamento
    nomeProdutoLabel, // F - Entregaveis (texto exato de Nome Produto)
    deal.value ?? "", // G - Valor
    `https://boardacademy.pipedrive.com/deal/${dealId}`, // H - Pipe
    String(deal[FIELD_KEYS.celular] ?? ""), // I - Celular
    String(deal[FIELD_KEYS.email] ?? ""), // J - E-mail
    String(deal[FIELD_KEYS.linkedin] ?? ""), // K - LinkedIn
    squad, // L - Squad (nome do funil)
    closer, // M - Closer (dono da venda)
    "", // N - Tema Livro (preenchimento manual)
    "", // O - OBS (preenchimento manual)
  ];

  return { status: "added", row };
}
