import type {
  AtletaStatus,
  FisioterapiaAtendimentoRow,
  FisioterapiaLesaoRow,
  FisioterapiaQueixaRow,
  FisioterapiaQueixaTipo,
} from "@/lib/supabase/types";

/**
 * Sub-área Fisioterapia do módulo Departamento Médico (Futebol Profissional) — ver
 * docs/superpowers/specs/2026-09-30-fisioterapia-design.md. Regras de negócio que não dependem do
 * Supabase (cálculo de dias afastados, rótulos, sincronização com `atletas.status`), separadas das
 * Server Actions pra poderem ser testadas sem simular um client (mesmo raciocínio de
 * `lib/futebol/classificacao-atleta.ts`/`lib/programacao/permissoes.ts`).
 */

export const QUEIXA_TIPO_OPTIONS: { value: FisioterapiaQueixaTipo; label: string }[] = [
  { value: "muscular", label: "Muscular" },
  { value: "articular", label: "Articular" },
];

const QUEIXA_TIPO_LABEL: Record<FisioterapiaQueixaTipo, string> = {
  muscular: "Muscular",
  articular: "Articular",
};

export function queixaTipoLabel(tipo: FisioterapiaQueixaTipo): string {
  return QUEIXA_TIPO_LABEL[tipo];
}

/**
 * Dias afastados de uma lesão — nunca gravado no banco, sempre calculado na hora de exibir:
 * `data_fim − data_inicio + 1` quando encerrada, ou `hoje − data_inicio + 1` enquanto ativa (mesmo
 * raciocínio de `calcularIdade` em `app/atletas/page.tsx`: computado no código, não guardado
 * desatualizável). `hojeStr` é sempre "YYYY-MM-DD" (ver `hojeBrasilia()`), igual `dataInicio`/
 * `dataFim` — comparação em texto ISO, sem depender do fuso horário de onde o código roda.
 * `dataInicio` nula (registro vindo do histórico importado, sem data exata) devolve `null` — nunca
 * inventa uma contagem a partir de uma data que não existe.
 */
export function diasAfastados(dataInicio: string | null, dataFim: string | null, hojeStr: string): number | null {
  if (!dataInicio) return null;
  const fim = dataFim ?? hojeStr;
  const inicio = new Date(`${dataInicio}T00:00:00Z`).getTime();
  const fimMs = new Date(`${fim}T00:00:00Z`).getTime();
  const dias = Math.round((fimMs - inicio) / (1000 * 60 * 60 * 24)) + 1;
  return dias < 1 ? 1 : dias;
}

/**
 * `atletas.status` que resulta de salvar/encerrar uma lesão (ver spec, seção 5) — sempre uma
 * função do estado ATUAL das lesões desse atleta depois da gravação, nunca do que o status era
 * antes: se ele ainda tem alguma lesão sem `data_fim` (`temLesaoAtiva`), o status é
 * "departamento_medico"; senão, volta pra "liberado" ("Apto"). Cobre os dois casos da spec com a
 * mesma regra — registrar uma lesão ativa deixa `temLesaoAtiva` `true`; encerrar a última lesão
 * ativa deixa `temLesaoAtiva` `false` (ou `true` se ainda sobrar outra em aberto). Nunca tenta
 * reconstruir um status anterior diferente de "Apto" (fora de escopo, ver a spec).
 */
export function statusFisioterapiaAtleta(temLesaoAtiva: boolean): AtletaStatus {
  return temLesaoAtiva ? "departamento_medico" : "liberado";
}

export interface FisioterapiaResumoLinha {
  atletaId: string;
  nome: string;
  emTratamento: boolean;
  totalDiasAfastados: number;
  ultimaQueixaData: string | null;
  totalAtendimentos: number;
}

/**
 * Monta a linha de cada atleta do Relatório Geral (visão consolidada, ver spec seção 3/4) — usada
 * tanto pela tela (`/departamento-medico/fisioterapia/relatorio`) quanto pela rota do PDF
 * (`.../relatorio/pdf`), pra não duplicar a mesma agregação nas duas. Só entram atletas com pelo
 * menos um registro (lesão, queixa ou atendimento); ordenados com quem está "em tratamento" agora
 * primeiro, depois por nome.
 */
export function montarResumoGeralFisioterapia(
  atletas: { id: string; nome: string }[],
  lesoes: Pick<FisioterapiaLesaoRow, "atleta_id" | "data_inicio" | "data_fim">[],
  queixas: Pick<FisioterapiaQueixaRow, "atleta_id" | "data">[],
  atendimentos: Pick<FisioterapiaAtendimentoRow, "atleta_id" | "quantidade">[],
  hojeStr: string,
): FisioterapiaResumoLinha[] {
  const linhas: FisioterapiaResumoLinha[] = [];

  for (const atleta of atletas) {
    const lesoesDoAtleta = lesoes.filter((l) => l.atleta_id === atleta.id);
    const queixasComData = queixas.filter((q) => q.atleta_id === atleta.id && q.data !== null) as {
      atleta_id: string;
      data: string;
    }[];
    const atendimentosDoAtleta = atendimentos.filter((a) => a.atleta_id === atleta.id);
    const queixasDoAtleta = queixas.filter((q) => q.atleta_id === atleta.id);
    if (lesoesDoAtleta.length === 0 && queixasDoAtleta.length === 0 && atendimentosDoAtleta.length === 0) continue;

    // Uma lesão do histórico importado (sem data_inicio, ver migração 0115) também tem data_fim
    // nula, mas não conta como "em tratamento" agora — só lesões com data_inicio real e sem fim.
    const emTratamento = lesoesDoAtleta.some((l) => l.data_inicio && !l.data_fim);
    // Registros do histórico importado (sem data_inicio) não entram na soma — não dá pra contar
    // dias afastados sem data, e inventar um valor seria pior do que não somar.
    const totalDiasAfastados = lesoesDoAtleta.reduce(
      (soma, l) => soma + (diasAfastados(l.data_inicio, l.data_fim, hojeStr) ?? 0),
      0,
    );
    const ultimaQueixaData =
      queixasComData.length > 0
        ? queixasComData.reduce((maisRecente, q) => (q.data > maisRecente ? q.data : maisRecente), queixasComData[0].data)
        : null;
    // `quantidade` cobre o registro único importado do histórico (ex.: "57 atendimentos" viram 1
    // registro com quantidade 57, não 57 linhas) — qualquer atendimento lançado pela tela vale 1
    // (quantidade nula).
    const totalAtendimentos = atendimentosDoAtleta.reduce((soma, a) => soma + (a.quantidade ?? 1), 0);

    linhas.push({
      atletaId: atleta.id,
      nome: atleta.nome,
      emTratamento,
      totalDiasAfastados,
      ultimaQueixaData,
      totalAtendimentos,
    });
  }

  return linhas.sort((a, b) => {
    if (a.emTratamento !== b.emTratamento) return a.emTratamento ? -1 : 1;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}
