import type { createClient } from "@/lib/supabase/server";
import { categoriaBaseLabel, TODAS_CATEGORIAS_BASE, type CategoriaBase } from "@/lib/auth/categorias-base";
import { buscarSemana } from "./queries";
import { diasDaSemana } from "./semana";
import { montarMicrocicloDias, montarPeriodoTexto, type MicrocicloDia } from "./microciclo-data";
import { corExportacaoAtividade } from "./cores-exportacao";

/**
 * Dados da Programação Geral (ver docs/superpowers/specs/2026-09-02-programacao-copiar-dia-layout-
 * geral-design.md, Parte 3) — compila as 7 categorias da semana num documento só.
 */

export interface ProgramacaoGeralCategoria {
  categoria: CategoriaBase;
  categoriaLabel: string;
  dias: MicrocicloDia[];
  /** Regra de visibilidade do grupo de turno (ver spec, "Regra de visibilidade do grupo de
   * turno"): um grupo só aparece se ao menos um dia da semana tiver ao menos uma atividade nele. */
  manhaVisivel: boolean;
  /** Tarde e Noite combinados num grupo só (mesma regra da Parte 2). */
  tardeVisivel: boolean;
  /** Categoria sem nenhuma atividade lançada em nenhum dia da semana inteira — vira uma única linha
   * "DESCANSO" no documento, sem separar por dia/turno. */
  temAtividadeNaSemana: boolean;
}

export interface ProgramacaoGeralData {
  periodoTexto: string;
  categorias: ProgramacaoGeralCategoria[];
}

/** Pura, testável sem Supabase (ver `programacao-geral-data.test.ts`). */
export function manhaVisivel(dias: MicrocicloDia[]): boolean {
  return dias.some((d) => d.atividadesPorTurno.manha.length > 0);
}

/** Pura, testável sem Supabase — Tarde e Noite combinados, mesma regra de agrupamento da Parte 2. */
export function tardeVisivel(dias: MicrocicloDia[]): boolean {
  return dias.some((d) => d.atividadesPorTurno.tarde.length > 0 || d.atividadesPorTurno.noite.length > 0);
}

/**
 * Busca as 7 categorias em paralelo (`Promise.all`, mesmo padrão de `contarPorCategoriaEStatus` da
 * Captação, `lib/futebol/captacao.ts`). Reaproveita `buscarSemana`/`montarMicrocicloDias` direto
 * (não `buscarMicrocicloData`, que também busca época/microciclo por categoria —
 * `configuracoes_programacao_base` — que a Programação Geral não mostra; evitaria 7 queries à toa).
 * Sem checagem de permissão própria — a rota que chama já é `/base`-only (ver
 * `app/programacao/geral/exportar/pdf/route.tsx`).
 */
export async function buscarProgramacaoGeralData(
  supabase: ReturnType<typeof createClient>,
  dataInicioSemana: string,
): Promise<ProgramacaoGeralData> {
  const dias = diasDaSemana(dataInicioSemana);

  const categorias = await Promise.all(
    TODAS_CATEGORIAS_BASE.map(async (categoria): Promise<ProgramacaoGeralCategoria> => {
      const atividades = await buscarSemana(supabase, categoria, dataInicioSemana);
      const diasMontados = montarMicrocicloDias(dias, atividades, corExportacaoAtividade);
      return {
        categoria,
        categoriaLabel: categoriaBaseLabel(categoria),
        dias: diasMontados,
        manhaVisivel: manhaVisivel(diasMontados),
        tardeVisivel: tardeVisivel(diasMontados),
        temAtividadeNaSemana: diasMontados.some((d) => d.temAtividade),
      };
    }),
  );

  return {
    periodoTexto: montarPeriodoTexto(dias[0], dias[dias.length - 1]),
    categorias,
  };
}
