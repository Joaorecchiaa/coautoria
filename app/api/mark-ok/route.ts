import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { setSimonato } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rowNumber = Number(body?.rowNumber);
    const value = body?.value === "OK" ? "OK" : "-";

    if (!Number.isInteger(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: "rowNumber inválido" }, { status: 400 });
    }

    await setSimonato(rowNumber, value);
    revalidatePath("/");

    return NextResponse.json({ ok: true, value });
  } catch (err: any) {
    console.error("Erro ao atualizar SIMONATO:", err);
    return NextResponse.json({ error: err?.message || "erro desconhecido" }, { status: 500 });
  }
}
