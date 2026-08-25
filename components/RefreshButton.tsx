"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [added, setAdded] = useState<number | null>(null);

  async function handleClick() {
    setStatus("loading");
    setAdded(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      if (!res.ok) throw new Error("falha");
      const data = await res.json();
      setAdded(data.novosAdicionados ?? 0);
      setStatus("done");
      router.refresh();
      setTimeout(() => setStatus("idle"), 4000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={status === "loading"}
        className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-white/20 disabled:opacity-60"
      >
        {status === "loading" ? "Atualizando..." : "↻ Atualizar"}
      </button>
      {status === "done" ? (
        <span className="text-xs text-white/60">
          {added && added > 0 ? `${added} venda(s) nova(s) encontrada(s)` : "Já estava tudo atualizado"}
        </span>
      ) : null}
      {status === "error" ? (
        <span className="text-xs text-accent-coral">Não consegui atualizar, tenta de novo</span>
      ) : null}
    </div>
  );
}
