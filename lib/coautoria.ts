// Lógica compartilhada: dado um deal ganho no Pipedrive, decide se ele é uma
// venda de coautoria e monta a linha pronta para entrar na planilha.
// Usada pelo cron diário e pelo botão "Atualizar" (via processWonDealsSince,
// que já busca só os negócios recentes com os campos certos) e pelo webhook
// em tempo real (via processDealForSheet, que busca um único negócio).

import {
  FIELD_KEYS,
  getDealFieldOptionMaps,
  getDealFull,
  getPipelineName,
  getUserName,
  getWonDealsSince,
  labelFor,
} from "./pipedrive";
import { mapWithConcurrency } from "./concurrency";

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

function buildRow(
  dealId: number,
  deal: Record<string, any>,
  nomeProdutoLabel: string,
  closer: string,
  squad: string,
  customFields: Record<string, any>
): (string | number)[] {
  const wonDate = (deal.won_time || deal.close_time || "").slice(0, 10);
  return [
    wonDate, // A - Data Inclusao
    "", // B - LIVRO (preenchimento manual)
    "-", // C - SIMONATO (pendente de double-check manual)
    deal.title || "", // D - Nome Coautor
    wonDate, // E - Data Fechamento
    nomeProdutoLabel, // F - Entregaveis (texto exato de Nome Produto)
    deal.value ?? "", // G - Valor
    `https://boardacademy.pipedrive.com/deal/${dealId}`, // H - Pipe
    String(customFields[FIELD_KEYS.celular] ?? ""), // I - Celular
    String(customFields[FIELD_KEYS.email] ?? ""), // J - E-mail
    String(customFields[FIELD_KEYS.linkedin] ?? ""), // K - LinkedIn
    squad, // L - Squad (nome do funil)
    closer, // M - Closer (dono da venda)
    "", // N - Tema Livro (preenchimento manual)
    "", // O - OBS (preenchimento manual)
  ];
}

export type ProcessResult =
  | { status: "added"; row: (string | number)[] }
  | { status: "already_exists" }
  | { status: "not_won" }
  | { status: "not_coautoria" }
  | { status: "not_found" };

/**
 * Processa um único negócio do Pipedrive pelo ID (busca o detalhe completo).
 * Usado pelo webhook em tempo real, que já sabe exatamente qual negócio
 * mudou de status.
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

  const closer = await ownerName(deal);
  const squad = deal.pipeline_id ? await getPipelineName(deal.pipeline_id) : "";

  const row = buildRow(dealId, deal, nomeProdutoLabel, closer, squad, deal);

  return { status: "added", row };
}

/**
 * Busca todos os negócios ganhos e atualizados desde `sinceISO` (API v2, já
 * com os campos customizados inclusos) e retorna as linhas prontas para
 * adicionar à planilha. Bem mais rápido que checar negócio por negócio,
 * porque não depende de busca por texto nem de uma chamada extra por
 * candidato.
 */
export async function processWonDealsSince(
  sinceISO: string,
  existingIds: Set<number>
): Promise<{ newRows: (string | number)[][]; consideredCount: number }> {
  const deals = await getWonDealsSince(sinceISO);
  const candidates = deals.filter((d) => !existingIds.has(d.id));

  const optionMaps = await getDealFieldOptionMaps();
  const nomeProdutoMap = optionMaps[FIELD_KEYS.nomeProduto];
  const bonusProdutoMap = optionMaps[FIELD_KEYS.bonusProduto];

  const rows = await mapWithConcurrency(candidates, 6, async (deal) => {
    const customFields = deal.custom_fields || {};
    const nomeProdutoLabel = labelFor(nomeProdutoMap, customFields[FIELD_KEYS.nomeProduto]);
    const bonusProdutoLabel = labelFor(bonusProdutoMap, customFields[FIELD_KEYS.bonusProduto]);

    const temCoautoriaNome = nomeProdutoLabel.toUpperCase().includes("COAUTORIA");
    const temCoautoriaBonus = bonusProdutoLabel.toUpperCase().includes("COAUTORIA");
    if (!temCoautoriaNome && !temCoautoriaBonus) return null;

    const closer = await ownerName(deal);
    const squad = deal.pipeline_id ? await getPipelineName(deal.pipeline_id) : "";

    return buildRow(deal.id, deal, nomeProdutoLabel, closer, squad, customFields);
  });

  return {
    newRows: rows.filter((r): r is (string | number)[] => Boolean(r)),
    consideredCount: candidates.length,
  };
}
