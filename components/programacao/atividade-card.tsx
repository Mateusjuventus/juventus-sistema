import { GameCard } from "./game-card";
import { corCartaoAtividade, formatHorarioCurto } from "@/lib/programacao/tipo-atividade";
import type { AtividadeComDetalhes } from "@/lib/programacao/queries";

/** Um cartão na grade da semana — cartão de jogo (escudos, horário, local, competição) quando a
 * atividade é 'jogo_oficial'/'jogo_treino', ou um bloco colorido genérico (cor do tipo) pros
 * demais. Clicar em qualquer um abre o detalhe da atividade. */
export function AtividadeCard({
  atividade,
  onClick,
}: {
  atividade: AtividadeComDetalhes;
  onClick: () => void;
}) {
  if (atividade.jogo) {
    return (
      <button type="button" onClick={onClick} className="block w-full text-left transition-transform hover:-translate-y-0.5">
        <GameCard jogo={atividade.jogo} tipo={atividade.tipo} compacto />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-lg px-2.5 py-1.5 text-left transition-transform hover:-translate-y-0.5 ${corCartaoAtividade(atividade.tipo)}`}
    >
      <p className="m-0 text-[10.5px] font-bold">
        {formatHorarioCurto(atividade.horario_inicio)}
        {atividade.horario_termino ? ` - ${formatHorarioCurto(atividade.horario_termino)}` : ""}
      </p>
      <p className="m-0 mt-0.5 truncate text-xs font-semibold">{atividade.nome}</p>
    </button>
  );
}
