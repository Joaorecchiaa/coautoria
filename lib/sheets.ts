import { google } from "googleapis";

// Colunas A-O na mesma ordem da planilha "Vendas Coautoria - Backlog":
// A DATA INCLUSAO | B LIVRO | C SIMONATO | D NOME COAUTOR | E DATA FECHAMENTO
// F ENTREGAVEIS | G VALOR | H PIPE | I CELULAR | J E-MAIL | K LINKEDIN
// L SQUAD | M CLOSER | N TEMA LIVRO | O OBS

export type SheetRow = string[];

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error(
      "Credenciais da conta de serviço do Google não configuradas (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)"
    );
  }
  let key = rawKey.trim();
  // Remove aspas extras que às vezes sobram ao colar o valor no .env.local
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, "\n").trim();
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function sheetsClient() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

function spreadsheetId() {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("GOOGLE_SHEET_ID não configurado");
  return id;
}

function tabName() {
  return process.env.GOOGLE_SHEET_TAB || "Planilha1";
}

export async function getSheetRows(): Promise<SheetRow[]> {
  const sheets = sheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${tabName()}!A2:O20000`,
  });
  return (res.data.values as SheetRow[]) || [];
}

// Define o valor da coluna C (SIMONATO) de uma linha específica.
// rowNumber é o número da linha DENTRO da planilha (linha 2 = primeira venda).
// value: "OK" para marcar, "-" para desmarcar (pendente).
export async function setSimonato(rowNumber: number, value: "OK" | "-") {
  const sheets = sheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId(),
    range: `${tabName()}!C${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[value]] },
  });
}

export async function appendRows(rows: (string | number)[][]) {
  if (!rows.length) return;
  const sheets = sheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId(),
    range: `${tabName()}!A:O`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
}

// Define o valor da coluna D (NOME COAUTOR) de uma venda específica — usado
// pra manter o título do negócio sincronizado quando ele é editado no
// Pipedrive depois que a venda já entrou na planilha.
export async function setNomeCoautor(rowNumber: number, nome: string) {
  const sheets = sheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId(),
    range: `${tabName()}!D${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[nome]] },
  });
}

// Define o valor da coluna B (LIVRO) de uma venda específica.
export async function setLivro(rowNumber: number, livro: string) {
  const sheets = sheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId(),
    range: `${tabName()}!B${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[livro]] },
  });
}

// Catálogo de livros cadastrados: guardado nas colunas Q (nome) e R (vagas)
// da mesma aba (mesma planilha, sem precisar de uma segunda aba), separado da
// coluna B (que guarda o livro de cada venda). Assim dá pra cadastrar um
// livro novo — com o número de vagas dele — mesmo antes de vinculá-lo a
// alguma venda. Livros antigos que nunca tiveram vagas definidas ficam com
// vagas = null (não controlamos capacidade deles).
const LIVROS_COL_NOME = "Q";
const LIVROS_COL_VAGAS = "R";

export type LivroCatalogEntry = {
  nome: string;
  vagas: number | null;
  rowNumber: number; // linha dentro da planilha, pra permitir atualizar depois
};

export async function getLivrosCatalog(): Promise<LivroCatalogEntry[]> {
  const sheets = sheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${tabName()}!${LIVROS_COL_NOME}2:${LIVROS_COL_VAGAS}2000`,
  });
  const values = (res.data.values as string[][]) || [];
  return values
    .map((r, i) => {
      const vagasRaw = (r[1] || "").trim();
      const vagas = vagasRaw !== "" && !Number.isNaN(Number(vagasRaw)) ? Number(vagasRaw) : null;
      return { nome: (r[0] || "").trim(), vagas, rowNumber: i + 2 };
    })
    .filter((e) => e.nome);
}

// Cria o livro no catálogo, ou atualiza o número de vagas se ele já existir
// (comparação sem diferenciar maiúsculas/minúsculas).
export async function upsertLivroCatalog(nome: string, vagas: number | null) {
  const catalog = await getLivrosCatalog();
  const existing = catalog.find((e) => e.nome.toLowerCase() === nome.toLowerCase());
  const sheets = sheetsClient();

  if (existing) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId(),
      range: `${tabName()}!${LIVROS_COL_NOME}${existing.rowNumber}:${LIVROS_COL_VAGAS}${existing.rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[nome, vagas ?? ""]] },
    });
    return { atualizado: true };
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId(),
    range: `${tabName()}!${LIVROS_COL_NOME}2:${LIVROS_COL_VAGAS}`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [[nome, vagas ?? ""]] },
  });
  return { atualizado: false };
}
