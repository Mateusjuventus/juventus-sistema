import type { createClient } from "@/lib/supabase/server";
import { categoriaBaseLabel, type CategoriaBase } from "@/lib/auth/categorias-base";
import type { ProgramacaoTurno } from "@/lib/supabase/types";
import { buscarSemana, type AtividadeComDetalhes, type JogoResumoAtividade } from "./queries";
import { diasDaSemana } from "./semana";
import { formatHorarioCurto, labelTipoAtividade } from "./tipo-atividade";
import { corExportacaoAtividade } from "./cores-exportacao";
import { nomeDiaSemanaCompleto, formatDataCurta, montarPeriodoTexto, montarLinhaMicrociclo } from "./microciclo-texto";

/** Reexportadas de `microciclo-texto.ts` (módulo puro, sem import de `./queries`/Supabase) pra não
 * quebrar quem já importa estas funções daqui — ver o comentário no topo de `microciclo-texto.ts`
 * pro motivo da extração (Client Components como `copiar-dia-modal.tsx` precisam de
 * `formatDataCurta` sem arrastar `sharp` pro bundle do navegador). */
export { nomeDiaSemanaCompleto, formatDataCurta, montarPeriodoTexto, montarLinhaMicrociclo };

export interface MicrocicloAtividade {
  id: string;
  nome: string;
  tipo: AtividadeComDetalhes["tipo"];
  tipoLabel: string;
  turno: ProgramacaoTurno;
  horarioInicio: string;
  horarioTermino: string | null;
  local: string | null;
  corBg: string;
  corText: string;
  jogo: JogoResumoAtividade | null;
}

export interface MicrocicloDia {
  data: string;
  diaSemana: string;
  dataFmt: string;
  atividadesPorTurno: Record<ProgramacaoTurno, MicrocicloAtividade[]>;
  temAtividade: boolean;
}

export interface MicrocicloData {
  categoria: CategoriaBase;
  categoriaLabel: string;
  epoca: string | null;
  microcicloAtual: number | null;
  /** Descrição livre do microciclo (ver spec, "Microciclo em texto livre") — substitui o número
   * fixo `microcicloAtual` no cabeçalho da exportação; `null` quando o treinador não preencheu. */
  microcicloTexto: string | null;
  periodoTexto: string;
  dias: MicrocicloDia[];
}

/** Agrupa as atividades já carregadas (`buscarSemana`) nos 7 dias da semana, por turno — puro, sem
 * tocar o Supabase, pra poder ser testado direto (ver `microciclo-data.test.ts`). Recebe a função de
 * cor como parâmetro (em vez de decidir sozinha) porque tanto o PDF (react-pdf) quanto o JPG
 * (next/og) leem o mesmo `MicrocicloAtividade` já pronto, sem duplicar o mapeamento de cor nos dois
 * lugares — hoje o único chamador real (`buscarMicrocicloData` abaixo) sempre passa
 * `corExportacaoAtividade` (paleta da exportação); os testes deste arquivo continuam passando
 * `corHexAtividade` (paleta da grade em tela) diretamente pra exercitar a função isoladamente. */
export function montarMicrocicloDias(
  dias: string[],
  atividades: AtividadeComDetalhes[],
  corHex: (tipo: AtividadeComDetalhes["tipo"]) => { bg: string; text: string },
): MicrocicloDia[] {
  return dias.map((data) => {
    const atividadesDoDia = atividades.filter((a) => a.data === data);
    const porTurno: Record<ProgramacaoTurno, MicrocicloAtividade[]> = { manha: [], tarde: [], noite: [] };

    for (const a of atividadesDoDia) {
      const cor = corHex(a.tipo);
      porTurno[a.turno].push({
        id: a.id,
        nome: a.nome,
        tipo: a.tipo,
        tipoLabel: labelTipoAtividade(a.tipo),
        turno: a.turno,
        horarioInicio: formatHorarioCurto(a.horario_inicio),
        horarioTermino: a.horario_termino ? formatHorarioCurto(a.horario_termino) : null,
        local: a.local,
        corBg: cor.bg,
        corText: cor.text,
        jogo: a.jogo,
      });
    }

    return {
      data,
      diaSemana: nomeDiaSemanaCompleto(data),
      dataFmt: formatDataCurta(data),
      atividadesPorTurno: porTurno,
      temAtividade: atividadesDoDia.length > 0,
    };
  });
}

/**
 * Monta todos os dados que a exportação do microciclo (PDF/JPG) precisa: os 7 dias da semana com
 * as atividades agrupadas por turno (cruzando com `jogos_base` pros dias de jogo, via
 * `buscarSemana`) e a época/número do microciclo configurados pra essa categoria (ver
 * `configuracoes_programacao_base` — o Mateus incrementa esse número manualmente a cada semana, do
 * jeito que já faz hoje em Excel). Não faz nenhuma checagem de permissão — mesma responsabilidade
 * de `buscarSemana`, quem chama já resolveu a categoria via `getCategoriasProgramacao()` antes.
 */
export async function buscarMicrocicloData(
  supabase: ReturnType<typeof createClient>,
  categoria: CategoriaBase,
  dataInicioSemana: string,
): Promise<MicrocicloData> {
  const dias = diasDaSemana(dataInicioSemana);

  const [atividades, { data: configData }] = await Promise.all([
    buscarSemana(supabase, categoria, dataInicioSemana),
    supabase
      .from("configuracoes_programacao_base")
      .select("epoca, microciclo_atual, microciclo_texto")
      .eq("categoria", categoria)
      .maybeSingle(),
  ]);

  return {
    categoria,
    categoriaLabel: categoriaBaseLabel(categoria),
    epoca: configData?.epoca ?? null,
    microcicloAtual: configData?.microciclo_atual ?? null,
    microcicloTexto: configData?.microciclo_texto ?? null,
    periodoTexto: montarPeriodoTexto(dias[0], dias[dias.length - 1]),
    dias: montarMicrocicloDias(dias, atividades, corExportacaoAtividade),
  };
}

/** Só o campo de texto livre do microciclo — usado pelo editor inline em `ProgramacaoView`, que não
 * precisa da `MicrocicloData` inteira (nem de buscar a semana de atividades). */
export async function buscarMicrocicloTexto(
  supabase: ReturnType<typeof createClient>,
  categoria: CategoriaBase,
): Promise<string | null> {
  const { data } = await supabase
    .from("configuracoes_programacao_base")
    .select("microciclo_texto")
    .eq("categoria", categoria)
    .maybeSingle();
  return data?.microciclo_texto ?? null;
}
