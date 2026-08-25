import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { extractDealIdsFromSheet, processDealForSheet } from "@/lib/coautoria";
import { appendRows, getSheetRows } from "@/lib/sheets";

export const dynamic = "force-dynamic";

// Se você configurou usuário/senha (autenticação HTTP Basic) ao criar o webhook
// no Pipedrive, defina WEBHOOK_BASIC_USER e WEBHOOK_BASIC_PASS nas variáveis de
// ambiente para exigir essas credenciais aqui. Se não definir nenhuma das duas,
// a rota aceita qualquer chamada (não recomendado em produção, mas funciona).
function isAuthorized(request: Request): boolean {
  const user = process.env.WEBHOOK_BASIC_USER;
  const pass = process.env.WEBHOOK_BASIC_PASS;
  if (!user && !pass) return true;

  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) return false;

  const decoded = Buffer.from(header.slice(6), "base64").toString("utf-8");
  const [u, p] = decoded.split(":");
  return u === user && p === pass;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const payload = await request.json();

    // Formato padrão dos webhooks do Pipedrive (v1): o negócio atualizado vem
    // em payload.current (ou payload.data, em versões mais novas do formato).
    // Também aceitamos o formato mais simples das Automations do Pipedrive
    // (ação "Enviar solicitação de webhook" montada com o construtor de
    // chave/valor), que manda só { "deal_id": 123 } no corpo.
    const deal = payload?.current || payload?.data || payload?.object;
    const dealId = Number(
      deal?.id ?? payload?.meta?.id ?? payload?.deal_id ?? payload?.dealId
    );

    if (!dealId) {
      return NextResponse.json({ error: "não encontrei o id do negócio no payload" }, {
        status: 400,
      });
    }

    const existingRows = await getSheetRows();
    const existingIds = extractDealIdsFromSheet(existingRows);

    const result = await processDealForSheet(dealId, existingIds);

    if (result.status === "added") {
      await appendRows([result.row]);
      revalidatePath("/");
    }

    return NextResponse.json({ dealId, resultado: result.status });
  } catch (err: any) {
    console.error("Erro no webhook do Pipedrive:", err);
    return NextResponse.json({ error: err?.message || "erro desconhecido" }, { status: 500 });
  }
}

// O Pipedrive faz uma checagem inicial (alguns fluxos usam GET) — respondemos OK
// pra facilitar validação manual da URL no navegador também.
export async function GET() {
  return NextResponse.json({ ok: true, info: "Webhook do Pipedrive está no ar. Use POST." });
}
