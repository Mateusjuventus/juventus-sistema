import { confrontoComPlacar, dataHorarioJogo } from "@/lib/futebol/ficha-atleta";
import type { JogoDetalheComContexto } from "@/lib/futebol/estatisticas-atleta-query";

/**
 * Uma linha da lista "jogo a jogo" (ver `app/atletas/[id]/dados-de-jogo/page.tsx` e o espelho da
 * Base) — confronto (já com placar e mandante-aware) e data/horário à esquerda; minutagem e os
 * contadores (gols/assistências/cartões) à direita, agrupados BEM próximos uns dos outros como
 * badges coloridos + uma barrinha proporcional ao tempo de jogo. Pedido do Mateus em 2026-10-27,
 * olhando a lista em texto corrido: "da pros gols e minutagem ficarem mais próximas [...] da pra
 * fazer por gráfico ou de alguma forma que fica melhor visualmente" — a barrinha é o "gráfico" (sem
 * precisar de uma lib de charts só pra isso) e os badges deixam gols/assistências/cartões como
 * destaques visuais em vez de texto solto.
 *
 * Só usada na tela (web) — os PDFs (`lib/pdf/ficha-atleta-document.tsx`,
 * `lib/pdf/atleta-relatorio-document.tsx`) continuam com `resumoDetalheJogo` (texto simples), que o
 * react-pdf renderiza bem e não precisa do mesmo tratamento visual de uma página HTML.
 */
export function JogoDetalheLinha({
  jogo,
  /** Duração total "de referência" do jogo (ver `duracaoReferenciaEstatisticas`) — usada só pra
   * escalar a barrinha de minutagem (quanto do jogo o atleta jogou), não precisa ser exata pra cada
   * jogo individualmente. */
  duracaoTotalReferencia,
}: {
  jogo: JogoDetalheComContexto;
  duracaoTotalReferencia: number;
}) {
  const percentualMinutagem =
    duracaoTotalReferencia > 0 ? Math.min(100, Math.round((jogo.minutos / duracaoTotalReferencia) * 100)) : 0;

  return (
    <div className="flex flex-col gap-2 rounded-md bg-neutral-50 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-neutral-800">
          {confrontoComPlacar(jogo.adversarioNome, jogo.mandante, jogo.golsPro, jogo.golsContra)}
        </p>
        <p className="text-xs text-neutral-500">{dataHorarioJogo(jogo.dataJogo, jogo.horario)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-1.5 rounded-full bg-white px-2 py-1 ring-1 ring-neutral-200">
          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-neutral-200">
            <div className="h-full rounded-full bg-grena" style={{ width: `${percentualMinutagem}%` }} />
          </div>
          <span className="text-xs font-semibold tabular-nums text-neutral-700">{jogo.minutos}min</span>
        </div>
        {jogo.gols > 0 ? (
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
            {jogo.gols === 1 ? "1 gol" : `${jogo.gols} gols`}
          </span>
        ) : null}
        {jogo.assistencias > 0 ? (
          <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">
            {jogo.assistencias === 1 ? "1 assist." : `${jogo.assistencias} assists.`}
          </span>
        ) : null}
        {jogo.cartoesAmarelos > 0 ? (
          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
            {jogo.cartoesAmarelos}x amarelo
          </span>
        ) : null}
        {jogo.cartoesVermelhos > 0 ? (
          <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
            {jogo.cartoesVermelhos}x vermelho
          </span>
        ) : null}
      </div>
    </div>
  );
}
