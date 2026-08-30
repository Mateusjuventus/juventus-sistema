import { JuventusCrestMark } from "@/components/juventus-crest";
import type { JogoResumoAtividade } from "@/lib/programacao/queries";
import { formatHorarioCurto, labelTipoAtividade } from "@/lib/programacao/tipo-atividade";
import type { ProgramacaoAtividadeTipo } from "@/lib/supabase/types";

function formatDataCurta(dataIso: string): string {
  const [, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}`;
}

function Escudo({ url, nome, tamanho }: { url: string | null; nome: string; tamanho: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={nome} className={`${tamanho} shrink-0 rounded-full border border-linha bg-white object-contain p-0.5`} />
  ) : (
    <div className={`${tamanho} flex shrink-0 items-center justify-center rounded-full border border-linha bg-neutral-50 text-[10px] font-semibold text-neutral-400`}>
      {nome.slice(0, 3).toUpperCase()}
    </div>
  );
}

/**
 * Cartão de jogo — usado no lugar do bloco colorido genérico quando a atividade é 'jogo_oficial'/
 * 'jogo_treino': os dois escudos, adversário, horário, local e competição juntos num único cartão
 * (pedido explícito do Mateus: "quando tiver jogo, colocar as logos bonitinha, horário, local e
 * qual competição tudo certinho" — não separar Local em outro período). Mesma regra de ordenação de
 * escudo (mandante primeiro) já usada em `/base/jogos`.
 */
export function GameCard({
  jogo,
  tipo,
  compacto = false,
}: {
  jogo: JogoResumoAtividade;
  tipo: ProgramacaoAtividadeTipo;
  /** Versão compacta pra caber na grade da semana; a versão completa (detalhe da atividade) mostra
   * também a competição/rodada por extenso. */
  compacto?: boolean;
}) {
  const juventus = { url: null, nome: "Juventus" };
  const [ladoEsquerdo, ladoDireito] = jogo.mandante
    ? [juventus, { url: jogo.adversarioLogoUrl, nome: jogo.adversario_nome }]
    : [{ url: jogo.adversarioLogoUrl, nome: jogo.adversario_nome }, juventus];

  const tamanhoEscudo = compacto ? "h-6 w-6" : "h-10 w-10";

  return (
    <div className={`rounded-lg border border-grena/20 bg-grena/5 ${compacto ? "p-2" : "p-3"}`}>
      <p className={`m-0 font-bold uppercase tracking-wide text-grena ${compacto ? "text-[9px]" : "text-xs"}`}>
        {labelTipoAtividade(tipo)}
      </p>
      <div className={`flex items-center justify-center gap-2 ${compacto ? "mt-1" : "mt-2"}`}>
        {ladoEsquerdo === juventus ? (
          <div className={`flex ${tamanhoEscudo} shrink-0 items-center justify-center rounded-full border border-linha bg-white p-0.5`}>
            <JuventusCrestMark className="h-full w-full" />
          </div>
        ) : (
          <Escudo url={ladoEsquerdo.url} nome={ladoEsquerdo.nome} tamanho={tamanhoEscudo} />
        )}
        <span className={`font-bold text-neutral-400 ${compacto ? "text-[10px]" : "text-sm"}`}>×</span>
        {ladoDireito === juventus ? (
          <div className={`flex ${tamanhoEscudo} shrink-0 items-center justify-center rounded-full border border-linha bg-white p-0.5`}>
            <JuventusCrestMark className="h-full w-full" />
          </div>
        ) : (
          <Escudo url={ladoDireito.url} nome={ladoDireito.nome} tamanho={tamanhoEscudo} />
        )}
      </div>
      <p className={`m-0 text-center font-semibold text-neutral-800 ${compacto ? "mt-1 truncate text-[11px]" : "mt-2 text-sm"}`}>
        {jogo.mandante ? `vs ${jogo.adversario_nome}` : `em ${jogo.adversario_nome}`}
      </p>
      <p className={`m-0 text-center text-neutral-500 ${compacto ? "text-[9.5px]" : "mt-1 text-xs"}`}>
        {formatDataCurta(jogo.data_jogo)} · {formatHorarioCurto(jogo.horario)}
        {jogo.local_estadio ? ` · ${jogo.local_estadio}` : ""}
      </p>
      {!compacto ? (
        <p className="m-0 mt-0.5 text-center text-xs text-neutral-500">
          {jogo.competicao}
          {jogo.rodada_fase ? ` · ${jogo.rodada_fase}` : ""}
        </p>
      ) : null}
    </div>
  );
}
