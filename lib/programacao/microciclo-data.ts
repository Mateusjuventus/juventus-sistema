import type { createClient } from "@/lib/supabase/server";
import { categoriaBaseLabel, type CategoriaBase } from "@/lib/auth/categorias-base";
import type { ProgramacaoTurno } from "@/lib/supabase/types";
import { buscarSemana, type AtividadeComDetalhes, type JogoResumoAtividade } from "./queries";
import { diasDaSemana } from "./semana";
import { corHexAtividade, formatHorarioCurto, labelTipoAtividade } from "./tipo-atividade";

const DIAS_SEMANA_COMPLETO = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];
const MESES_EXTENSO = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** Nome completo do dia da semana em maiúsculas ("SEGUNDA") — mesmo vocabulário do modelo impresso
 * que o Mateus já usa (ver mockup aprovado), diferente da abreviação de 3 letras usada na grade em
 * tela (`DIA_SEMANA_LABEL` em `components/programacao/programacao-view.tsx`). */
export function nomeDiaSemanaCompleto(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return DIAS_SEMANA_COMPLETO[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()];
}

/** "2026-08-24" -> "24/08". */
export function formatDataCurta(dataIso: string): string {
  const [, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}`;
}

/** Texto do período do microciclo, no mesmo formato do modelo impresso ("Plano de 24 a 30 de
 * Agosto") — quando a semana atravessa a virada do mês, cada ponta ganha seu próprio mês por
 * extenso ("Plano de 31 de Agosto a 6 de Setembro") pra não ficar ambíguo. */
export function montarPeriodoTexto(dataInicio: string, dataFim: string): string {
  const [, mesInicioStr, diaInicioStr] = dataInicio.split("-");
  const [, mesFimStr, diaFimStr] = dataFim.split("-");
  const diaInicio = String(Number(diaInicioStr));
  const diaFim = String(Number(diaFimStr));
  const mesInicio = MESES_EXTENSO[Number(mesInicioStr) - 1];
  const mesFim = MESES_EXTENSO[Number(mesFimStr) - 1];

  if (mesInicioStr === mesFimStr) {
    return `Plano de ${diaInicio} a ${diaFim} de ${mesFim}`;
  }
  return `Plano de ${diaInicio} de ${mesInicio} a ${diaFim} de ${mesFim}`;
}

export interface MicrocicloAtividade {
  id: string;
  nome: string;
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
  periodoTexto: string;
  dias: MicrocicloDia[];
}

/** Agrupa as atividades já carregadas (`buscarSemana`) nos 7 dias da semana, por turno — puro, sem
 * tocar o Supabase, pra poder ser testado direto (ver `microciclo-data.test.ts`). Precisa das cores
 * de `corHexAtividade` aqui dentro (em vez de só no documento) porque tanto o PDF (react-pdf) quanto
 * o JPG (next/og) leem o mesmo `MicrocicloAtividade` já pronto, sem duplicar o mapeamento de cor
 * nos dois lugares. */
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
    supabase.from("configuracoes_programacao_base").select("epoca, microciclo_atual").eq("categoria", categoria).maybeSingle(),
  ]);

  return {
    categoria,
    categoriaLabel: categoriaBaseLabel(categoria),
    epoca: configData?.epoca ?? null,
    microcicloAtual: configData?.microciclo_atual ?? null,
    periodoTexto: montarPeriodoTexto(dias[0], dias[dias.length - 1]),
    dias: montarMicrocicloDias(dias, atividades, corHexAtividade),
  };
}
