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
import { setNomeCoautor } from "./sheets";
import { mapWithConcurrency } from "./concurrency";

export type ExistingDealInfo = { rowNumber: number; nomeAtual: string };

// Mapeia deal_id -> {linha na planilha, nome salvo atualmente}, lendo o link
// do Pipedrive na coluna H (Pipe) e o texto da coluna D (Nome Coautor).
export function extractDealIdsFromSheet(rows: string[][]): Map<number, ExistingDealInfo> {
  const map = new Map<number, ExistingDealInfo>();
  rows.forEach((row, i) => {
    const pipe = row[7] || ""; // coluna H
    const m = String(pipe).match(/\/deal\/(\d+)/);
    if (m) {
      map.set(Number(m[1]), { rowNumber: i + 2, nomeAtual: (row[3] || "").trim() });
    }
  });
  return map;
}

function ownerName(deal: Record<string, any>): Promise<string> | string {
  const owner = deal.owner_id;
  if (owner && typeof owner === "object" && owner.name) return owner.name as string;
  if (owner) return getUserName(typeof owner === "object" ? owner.value : owner);
  return "";
}

// Decide se o negócio é uma venda de coautoria olhando os três campos que
// podem conter isso — "Nome Produto", "Bônus - Produto" e "Produto" — e
// escolhe qual texto usar como Entregável: o primeiro desses três campos
// que realmente contiver "COAUTORIA" (nessa ordem de prioridade). Cada label
// já vem com múltiplas opções resolvidas (ex.: "BOARD PRO PFIC + COAUTORIA"),
// graças ao labelFor tratar campos de múltipla escolha.
function resolveCoautoria(labels: {
  nomeProduto: string;
  bonusProduto: string;
  produto: string;
}): { isCoautoria: boolean; entregavelLabel: string } {
  const candidates = [labels.nomeProduto, labels.produto, labels.bonusProduto];
  const match = candidates.find((label) => label.toUpperCase().includes("COAUTORIA"));
  return {
    isCoautoria: Boolean(match),
    entregavelLabel: match || labels.nomeProduto || labels.produto || labels.bonusProduto,
  };
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
  | { status: "title_updated" }
  | { status: "not_won" }
  | { status: "not_coautoria" }
  | { status: "not_found" };

/**
 * Processa um único negócio do Pipedrive pelo ID (busca o detalhe completo).
 * Usado pelo webhook em tempo real, que já sabe exatamente qual negócio
 * mudou de status. Se o negócio já está na planilha, aproveita pra conferir
 * se o título mudou no Pipedrive e atualizar a coluna Nome Coautor.
 */
export async function processDealForSheet(
  dealId: number,
  existingIds: Map<number, ExistingDealInfo>
): Promise<ProcessResult> {
  const existing = existingIds.get(dealId);

  const deal = await getDealFull(dealId);
  if (!deal) return { status: "not_found" };

  if (existing) {
    const novoTitulo = (deal.title || "").trim();
    if (novoTitulo && novoTitulo !== existing.nomeAtual) {
      await setNomeCoautor(existing.rowNumber, novoTitulo);
      return { status: "title_updated" };
    }
    return { status: "already_exists" };
  }

  if (deal.status !== "won") {
    return { status: "not_won" };
  }

  const optionMaps = await getDealFieldOptionMaps();
  const nomeProdutoMap = optionMaps[FIELD_KEYS.nomeProduto];
  const bonusProdutoMap = optionMaps[FIELD_KEYS.bonusProduto];
  const produtoMap = optionMaps[FIELD_KEYS.produto];

  const nomeProdutoLabel = labelFor(nomeProdutoMap, deal[FIELD_KEYS.nomeProduto]);
  const bonusProdutoLabel = labelFor(bonusProdutoMap, deal[FIELD_KEYS.bonusProduto]);
  const produtoLabel = labelFor(produtoMap, deal[FIELD_KEYS.produto]);

  const { isCoautoria, entregavelLabel } = resolveCoautoria({
    nomeProduto: nomeProdutoLabel,
    bonusProduto: bonusProdutoLabel,
    produto: produtoLabel,
  });

  if (!isCoautoria) {
    return { status: "not_coautoria" };
  }

  const closer = await ownerName(deal);
  const squad = deal.pipeline_id ? await getPipelineName(deal.pipeline_id) : "";

  const row = buildRow(dealId, deal, entregavelLabel, closer, squad, deal);

  return { status: "added", row };
}

/**
 * Busca todos os negócios ganhos e atualizados desde `sinceISO` (API v2, já
 * com os campos customizados inclusos) e retorna as linhas prontas para
 * adicionar à planilha. Negócios que já estão na planilha, mas reaparecem
 * aqui porque foram atualizados (ex.: título editado), têm a coluna Nome
 * Coautor sincronizada em vez de serem simplesmente ignorados.
 */
export async function processWonDealsSince(
  sinceISO: string,
  existingIds: Map<number, ExistingDealInfo>
): Promise<{ newRows: (string | number)[][]; consideredCount: number; titleUpdates: number }> {
  const deals = await getWonDealsSince(sinceISO);

  const newCandidates = deals.filter((d) => !existingIds.has(d.id));
  const existingCandidates = deals.filter((d) => existingIds.has(d.id));

  const optionMaps = await getDealFieldOptionMaps();
  const nomeProdutoMap = optionMaps[FIELD_KEYS.nomeProduto];
  const bonusProdutoMap = optionMaps[FIELD_KEYS.bonusProduto];
  const produtoMap = optionMaps[FIELD_KEYS.produto];

  const rows = await mapWithConcurrency(newCandidates, 6, async (deal) => {
    const customFields = deal.custom_fields || {};
    const nomeProdutoLabel = labelFor(nomeProdutoMap, customFields[FIELD_KEYS.nomeProduto]);
    const bonusProdutoLabel = labelFor(bonusProdutoMap, customFields[FIELD_KEYS.bonusProduto]);
    const produtoLabel = labelFor(produtoMap, customFields[FIELD_KEYS.produto]);

    const { isCoautoria, entregavelLabel } = resolveCoautoria({
      nomeProduto: nomeProdutoLabel,
      bonusProduto: bonusProdutoLabel,
      produto: produtoLabel,
    });
    if (!isCoautoria) return null;

    const closer = await ownerName(deal);
    const squad = deal.pipeline_id ? await getPipelineName(deal.pipeline_id) : "";

    return buildRow(deal.id, deal, entregavelLabel, closer, squad, customFields);
  });

  let titleUpdates = 0;
  await mapWithConcurrency(existingCandidates, 6, async (deal) => {
    const existing = existingIds.get(deal.id)!;
    const novoTitulo = (deal.title || "").trim();
    if (novoTitulo && novoTitulo !== existing.nomeAtual) {
      await setNomeCoautor(existing.rowNumber, novoTitulo);
      titleUpdates++;
    }
  });

  return {
    newRows: rows.filter((r): r is (string | number)[] => Boolean(r)),
    consideredCount: newCandidates.length,
    titleUpdates,
  };
}
