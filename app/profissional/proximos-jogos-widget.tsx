import Link from "next/link";
import { JuventusCrestMark } from "@/components/juventus-crest";
import { tituloJogo } from "@/lib/futebol/calendario";
import type { JogoRow } from "@/lib/supabase/types";

function formatData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatHorario(horario: string | null): string | null {
  return horario ? horario.slice(0, 5) : null;
}

/** Escudo pequeno (18px), mesma regra do quadrado de dia do widget "Calendário" — `logoUrl` null
 * cai num círculo com as 3 primeiras letras do nome. Juventus sempre usa o brasão fixo (nunca cai
 * nas iniciais). */
function EscudoMini({ logoUrl, nome, juventus }: { logoUrl: string | null; nome: string; juventus?: boolean }) {
  if (juventus) {
    return (
      <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-white bg-white p-0.5">
        <JuventusCrestMark className="h-full w-full" />
      </div>
    );
  }
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={nome} className="h-[18px] w-[18px] shrink-0 rounded-full border border-white bg-white object-contain" />;
  }
  return (
    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-white bg-neutral-100 text-[7px] font-bold text-neutral-400">
      {nome.slice(0, 2).toUpperCase()}
    </span>
  );
}

/**
 * Widget "Próximos jogos" — coluna lateral direita da Home, logo abaixo do Mural (ver pedido do
 * usuário). Diferente do widget "Próximo jogo" (coluna central, só o jogo mais próximo com todos
 * os detalhes: local, competição etc.) e diferente do Mural (só até 10 dias, misturado com eventos
 * e contratos vencendo) — aqui é uma lista compacta dos próximos jogos, sem limite de dias, pra dar
 * uma visão do calendário de jogos mais à frente sem precisar abrir o widget "Calendário" ou a aba
 * de Jogos.
 */
export function ProximosJogosWidget({
  jogos,
  logoPorJogoId,
}: {
  jogos: JogoRow[];
  logoPorJogoId: Map<string, string | null>;
}) {
  return (
    <div className="card p-4">
      <h2 className="text-sm font-bold text-grena-escuro">Próximos jogos</h2>
      <p className="mt-0.5 text-[11px] text-neutral-400">Agenda de jogos à frente</p>

      {jogos.length === 0 ? (
        <p className="mt-4 text-center text-xs text-neutral-400">Nenhum jogo agendado.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {jogos.map((jogo) => {
            const logoAdversario = logoPorJogoId.get(jogo.id) ?? null;
            const juventus = { juventus: true as const, nome: "Juventus", logoUrl: null };
            const adversario = { juventus: false as const, nome: jogo.adversario_nome, logoUrl: logoAdversario };
            const [ladoEsquerdo, ladoDireito] = jogo.mandante ? [juventus, adversario] : [adversario, juventus];
            const hora = formatHorario(jogo.horario);
            return (
              <Link
                key={jogo.id}
                href="/jogos"
                className="flex items-center gap-2 rounded-md border border-linha p-2 transition-colors hover:bg-neutral-50"
              >
                <div className="flex shrink-0 items-center -space-x-1.5">
                  <EscudoMini {...ladoEsquerdo} />
                  <EscudoMini {...ladoDireito} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-neutral-800" title={tituloJogo(jogo)}>
                    {tituloJogo(jogo)}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {formatData(jogo.data_jogo)}
                    {hora ? ` · ${hora}` : ""}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
