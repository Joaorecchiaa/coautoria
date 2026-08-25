// Integração com a API v1 do Pipedrive.
// Documentação: https://developers.pipedrive.com/docs/api/v1

const PIPEDRIVE_DOMAIN = process.env.PIPEDRIVE_DOMAIN || "boardacademy";
const BASE_URL = `https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1`;

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

// ---- busca de negócios ganhos que citam COAUTORIA (candidatos) ----
export async function searchWonCoautoriaDealIds(): Promise<number[]> {
  const ids = new Set<number>();
  let start = 0;
  const limit = 100;
  const maxPages = 8; // trava de segurança: evita estourar o tempo da função

  for (let page = 0; page < maxPages; page++) {
    const json = await pdFetch("/deals/search", {
      term: "COAUTORIA",
      status: "won",
      limit: String(limit),
      start: String(start),
    });
    const items = json.data?.items || [];
    for (const it of items) ids.add(it.item.id);

    const moreItems = json.additional_data?.pagination?.more_items_in_collection;
    if (!moreItems) break;
    start += limit;
  }

  return [...ids];
}

// ---- detalhe completo de um negócio ----
export async function getDealFull(id: number): Promise<Record<string, any> | null> {
  const json = await pdFetch(`/deals/${id}`);
  return json.data || null;
}
