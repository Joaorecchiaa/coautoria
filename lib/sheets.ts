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
  const key = rawKey.replace(/\\n/g, "\n");
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
