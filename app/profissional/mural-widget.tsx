import { COR_CATEGORIA_JOGO, corDaCategoria, type ItemMural, type Urgencia } from "@/lib/futebol/calendario";

function formatHorario(horario: string | null): string | null {
  return horario ? horario.slice(0, 5) : null;
}

function textoDias(dias: number): string {
  if (dias === 0) return "Hoje";
  if (dias === 1) return "Amanhã";
  return `Em ${dias} dias`;
}

const CLASSE_URGENCIA: Record<Urgencia, string> = {
  urgente: "bg-red-50 text-red-700",
  atencao: "bg-amber-50 text-amber-700",
  ok: "bg-emerald-50 text-emerald-700",
};

/**
 * Widget "Mural" — coluna lateral direita (224px) da Home do Futebol Profissional. Reaproveita a
 * mesma regra que `/avisos` já usa (`DIAS_PRAZO_CURTO = 10`), aplicada a jogos + eventos manuais
 * juntos numa lista só (ver a spec do redesign visual). Canal só dentro do sistema — sem e-mail,
 * WhatsApp ou push (confirmado com o usuário durante o brainstorming).
 */
export function MuralWidget({ itens }: { itens: ItemMural[] }) {
  return (
    <div className="card p-4">
      <h2 className="text-sm font-bold text-grena-escuro">Mural</h2>
      <p className="mt-0.5 text-[11px] text-neutral-400">Jogos e eventos dos próximos 10 dias</p>

      {itens.length === 0 ? (
        <p className="mt-4 text-center text-xs text-neutral-400">Nada nos próximos 10 dias.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {itens.map((m, i) => {
            const cor = m.item.tipo === "jogo" ? COR_CATEGORIA_JOGO : corDaCategoria(m.item.categoria);
            const hora = formatHorario(m.item.horario);
            return (
              <div key={i} className="rounded-md border border-linha p-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${CLASSE_URGENCIA[m.urgencia]}`}
                  >
                    {textoDias(m.diasRestantes)}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs font-medium text-neutral-800" title={m.item.titulo}>
                  {m.item.titulo}
                </p>
                {hora ? <p className="text-[11px] text-neutral-400">{hora}</p> : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
