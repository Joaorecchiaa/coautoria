// Integração com a API do Pipedrive (v1 para endpoints auxiliares e v2 para a
// listagem de negócios, que suporta filtrar por data de atualização e já traz
// os campos customizados junto — bem mais rápido que buscar por texto e
// depois abrir negócio por negócio).
// Documentação: https://developers.pipedrive.com/docs/api/v1 e /v2

const PIPEDRIVE_DOMAIN = process.env.PIPEDRIVE_DOMAIN || "boardacademy";
const BASE_URL = `https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1`;
const BASE_URL_V2 = `https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v2`;

export const FIELD_KEYS = {
  nomeProduto: "09d57fd58b8cac693f5901417f758df746223273",
  bonusProduto: "de3ea26cf28b5d9505dcf5b02792ec09699314fc",
  celular: "499d03669b5da808d338baae6fb730c5a3a41b01",
  email: "78446a38c20aa964be3dcda509189d8a8f28b41e",
  linkedin: "1453c308865745ef64745f7413132f009a5c9428",
};

function token() {
  const t = process.env.PIPEDRIVE_API_TOKEN;
  if (!t) throw new Error("PIPEDRIVE_API_TOKEN não configurado");
  return t;
}

async function pdFetch(path: string, params: Record<string, string> = {}) {
  const url = new URL(BASE_URL + path);
  url.searchParams.set("api_token", token());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Pipedrive API ${path} -> ${res.status}: ${raw}`);
  }
  if (!raw) {
    throw new Error(`Pipedrive API ${path} -> resposta vazia (possível timeout)`);
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Pipedrive API ${path} -> resposta não é um JSON válido`);
  }
}

async function pdFetchV2(path: string, params: Record<string, string> = {}) {
  const url = new URL(BASE_URL_V2 + path);
  url.searchParams.set("api_token", token());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Pipedrive API v2 ${path} -> ${res.status}: ${raw}`);
  }
  if (!raw) {
    throw new Error(`Pipedrive API v2 ${path} -> resposta vazia (possível timeout)`);
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Pipedrive API v2 ${path} -> resposta não é um JSON válido`);
  }
}

// ---- dealFields: resolve rótulos de campos de opção única (Nome Produto, Bônus - Produto) ----
let optionMapCache: Record<string, Record<string, string>> | null = null;

export async function getDealFieldOptionMaps() {
  if (optionMapCache) return optionMapCache;
  const json = await pdFetch("/dealFields");
  const map: Record<string, Record<string, string>> = {};
  for (const field of json.data || []) {
    if (Array.isArray(field.options)) {
      map[field.key] = {};
      for (const opt of field.options) {
        map[field.key][String(opt.id)] = opt.label;
      }
    }
  }
  optionMapCache = map;
  return map;
}

export function labelFor(
  map: Record<string, string> | undefined,
  value: unknown
): string {
  if (value === null || value === undefined || value === "") return "";
  if (map && map[String(value)]) return map[String(value)];
  return String(value);
}

// ---- usuários (closers) ----
let usersCache: Record<string, string> | null = null;

export async function getUserName(ownerId: number | string): Promise<string> {
  if (!usersCache) {
    const json = await pdFetch("/users");
    usersCache = {};
    for (const u of json.data || []) usersCache[String(u.id)] = u.name;
  }
  return usersCache[String(ownerId)] || String(ownerId);
}

// ---- funis (squads) ----
let pipelinesCache: Record<string, string> | null = null;

export async function getPipelineName(
  pipelineId: number | string
): Promise<string> {
  if (!pipelinesCache) {
    const json = await pdFetch("/pipelines");
    pipelinesCache = {};
    for (const p of json.data || []) pipelinesCache[String(p.id)] = p.name;
  }
  return pipelinesCache[String(pipelineId)] || String(pipelineId);
}

// ---- negócios ganhos e atualizados desde uma data (candidatos recentes) ----
// Usa a API v2, que permite filtrar por status + data de atualização e já
// devolve os campos customizados junto — não precisamos mais buscar por texto
// nem abrir negócio por negócio para checar se é coautoria. O histórico
// antigo já está registrado na planilha, então só precisamos olhar o que
// mudou desde `sinceISO` pra frente.
export async function getWonDealsSince(
  sinceISO: string
): Promise<Record<string, any>[]> {
  const deals: Record<string, any>[] = [];
  const limit = 100;
  const maxPages = 20; // trava de segurança
  let cursor: string | undefined;

  const customFieldKeys = [
    FIELD_KEYS.nomeProduto,
    FIELD_KEYS.bonusProduto,
    FIELD_KEYS.celular,
    FIELD_KEYS.email,
    FIELD_KEYS.linkedin,
  ].join(",");

  for (let page = 0; page < maxPages; page++) {
    const params: Record<string, string> = {
      status: "won",
      updated_since: sinceISO,
      limit: String(limit),
      custom_fields: customFieldKeys,
      sort_by: "update_time",
      sort_direction: "desc",
    };
    if (cursor) params.cursor = cursor;

    const json = await pdFetchV2("/deals", params);
    const items = json.data || [];
    deals.push(...items);

    cursor = json.additional_data?.next_cursor;
    if (!cursor || items.length === 0) break;
  }

  return deals;
}

// ---- detalhe completo de um único negócio (usado pelo webhook em tempo real) ----
export async function getDealFull(id: number): Promise<Record<string, any> | null> {
  const json = await pdFetch(`/deals/${id}`);
  return json.data || null;
}
