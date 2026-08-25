import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { markSimonatoOk } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rowNumber = Number(body?.rowNumber);

    if (!Number.isInteger(rowNumber) || rowNumber < 2) {
      return NextResponse.json({ error: "rowNumber inválido" }, { status: 400 });
    }

    await markSimonatoOk(rowNumber);
    revalidatePath("/");

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Erro ao marcar OK:", err);
    return NextResponse.json({ error: err?.message || "erro desconhecido" }, { status: 500 });
  }
}
