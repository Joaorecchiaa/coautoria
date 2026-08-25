function formatUpdatedAt(date: Date) {
  const time = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  const day = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  return `${day} às ${time}`;
}

export function DashboardHeader({ updatedAt }: { updatedAt: Date }) {
  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-end justify-between gap-4 px-6 py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">COAUTORIAS</h1>
          <p className="mt-1 text-sm text-white/60">
            Vendas com COAUTORIA identificadas no Pipedrive, sincronizadas diariamente com a
            planilha de backlog.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Board Academy
          </span>
          <span className="text-xs text-white/60">
            Atualizado em {formatUpdatedAt(updatedAt)}
          </span>
        </div>
      </div>
    </header>
  );
}
