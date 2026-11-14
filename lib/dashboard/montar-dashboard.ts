import type { createClient } from "@/lib/supabase/server";
import type { DepartamentoChave } from "@/lib/auth/departamentos";
import type { CategoriaProgramacao } from "@/lib/programacao/categoria-programacao";
import { getCategoriasProgramacaoProfissional, getCategoriasProgramacao } from "@/lib/programacao/permissoes";
import { getModulosPermitidos, getModulosBasePermitidos, isMaster } from "@/lib/auth/role";
import { hojeBrasilia } from "@/lib/data-brasil";
import {
  buscarProximosJogos,
  buscarContratosAVencer,
  buscarAniversariantesDoMes,
  buscarAlertasCalendario,
  buscarAlertasCompeticao,
  buscarAlertasDocumentos,
  buscarAtletasEmDm,
  buscarSolicitacoesPendentes,
  buscarProgramacaoDeHoje,
  type DepartamentoDashboard,
} from "@/lib/dashboard/queries";
import type { DashboardViewProps } from "@/components/dashboard/dashboard-view";

/**
 * Composição do Dashboard/Painel principal (ver docs/superpowers/specs/2026-11-14-dashboard-
 * principal-design.md, revisão de 14/11/2026 — o Mateus apontou que o painel tinha ficado
 * "separado" de novo, contrariando o processo de unificação já em andamento no resto do sistema —
 * mesmo espírito de `app/comissao-tecnica/page.tsx` desde 28/10/2026).
 *
 * `app/profissional/page.tsx` e `app/base/page.tsx` chamam ESTA MESMA função. Quando a conta só
 * tem um departamento liberado (`getDepartamentosPermitidos`), o resultado é idêntico ao que cada
 * página montava sozinha antes — nenhum item ganha a tag `departamento`, nenhuma ambiguidade
 * nova. Quando a conta tem os dois, cada bloco busca dos dois departamentos (reaproveitando as
 * MESMAS funções de `lib/dashboard/queries.ts`, chamadas uma vez por departamento liberado —
 * nenhuma delas mudou de assinatura) e mescla o resultado num só bloco, marcando cada item com
 * `departamento: "profissional" | "base"` só neste caso.
 *
 * "Próximos jogos" combina os 3 mais próximos NO TOTAL, não 3 de cada: pedir o top-3 de CADA
 * departamento (o que `buscarProximosJogos` já faz, `limite` padrão 3) e mesclar é equivalente a
 * calcular o top-3 do total combinado — nenhum jogo fora do top-3 de um departamento pode entrar
 * no top-3 global, porque nesse MESMO departamento já existem ≥3 jogos mais próximos que ele (os
 * que ocupam as posições 1-3 ali). Não precisa buscar mais que 3 de cada lado pra ter a resposta
 * certa; só mesclar os dois top-3 e cortar de novo pros 3 primeiros do conjunto junto.
 */

type ComDepartamento<T> = T & { departamento?: DepartamentoDashboard };

function marcar<T>(itens: T[], departamento: DepartamentoDashboard): ComDepartamento<T>[] {
  return itens.map((item) => ({ ...item, departamento }));
}

/** Mescla o resultado dos dois departamentos pra um bloco. `null` só quando NENHUM dos dois tem o
 * módulo liberado (mesmo contrato que cada página já respeitava sozinha — o bloco inteiro some).
 * Fora do modo "múltiplo departamento" (conta com só um dos dois), devolve o único lado não-nulo
 * sem nenhuma tag — comportamento idêntico ao de antes desta unificação. */
function mesclarBloco<T>(
  itensProfissional: T[] | null,
  itensBase: T[] | null,
  multiplo: boolean,
): ComDepartamento<T>[] | null {
  if (itensProfissional === null && itensBase === null) return null;
  if (!multiplo) return (itensProfissional ?? itensBase ?? []) as ComDepartamento<T>[];
  return [
    ...(itensProfissional ? marcar(itensProfissional, "profissional") : []),
    ...(itensBase ? marcar(itensBase, "base") : []),
  ];
}

export async function montarDashboard(
  supabase: ReturnType<typeof createClient>,
  departamentosPermitidos: DepartamentoChave[],
): Promise<DashboardViewProps> {
  const temProfissional = departamentosPermitidos.includes("futebol_profissional");
  const temBase = departamentosPermitidos.includes("futebol_base");
  const multiplo = temProfissional && temBase;

  const hojeStr = hojeBrasilia();

  const [master, { data: userData }, categoriasProfissional, categoriasBase, modulosProfissional, modulosBase] =
    await Promise.all([
      isMaster(supabase),
      supabase.auth.getUser(),
      temProfissional
        ? getCategoriasProgramacaoProfissional(supabase)
        : Promise.resolve([] as CategoriaProgramacao[]),
      // `getCategoriasProgramacao` devolve `CategoriaBase[]` (subconjunto de `CategoriaProgramacao`,
      // sem "profissional") — mesmo cast que `app/base/page.tsx` nunca precisou porque só passava
      // isso pra funções tipadas `string[]`; aqui precisa ficar explícito porque o resultado
      // também vai pro `[...categoriasProfissional, ...categoriasBase]` combinado abaixo.
      (temBase ? getCategoriasProgramacao(supabase) : Promise.resolve([])) as Promise<CategoriaProgramacao[]>,
      temProfissional ? getModulosPermitidos(supabase) : Promise.resolve([] as string[]),
      temBase ? getModulosBasePermitidos(supabase) : Promise.resolve([] as string[]),
    ]);
  const userId = userData.user?.id ?? null;

  const podeJogosProf = temProfissional && modulosProfissional.includes("jogos");
  const podeJogosBase = temBase && modulosBase.includes("jogos");
  const podeAtletasProf = temProfissional && modulosProfissional.includes("atletas");
  const podeAtletasBase = temBase && modulosBase.includes("atletas");
  const podeComissaoProf = temProfissional && modulosProfissional.includes("comissao_tecnica");
  const podeComissaoBase = temBase && modulosBase.includes("comissao_tecnica");
  const podeAniversariantesProf = podeAtletasProf || podeComissaoProf;
  const podeAniversariantesBase = podeAtletasBase || podeComissaoBase;
  const podeCompeticoesProf = temProfissional && modulosProfissional.includes("competicoes");
  const podeCompeticoesBase = temBase && modulosBase.includes("competicoes");
  // Termos de Retirada não é um módulo da Base hoje (ver lib/auth/modulos-base.ts e, antes desta
  // unificação, o comentário equivalente em app/base/page.tsx) — só existe pro lado Profissional.
  const podeTermos = temProfissional && modulosProfissional.includes("termos_retirada");
  const podeDmProf = temProfissional && modulosProfissional.includes("departamento_medico");
  const podeDmBase = temBase && modulosBase.includes("departamento_medico");
  const podeSolicitacoesProf = temProfissional && modulosProfissional.includes("solicitacoes");
  const podeSolicitacoesBase = temBase && modulosBase.includes("solicitacoes");

  const [
    jogosProf,
    jogosBase,
    contratosProf,
    contratosBase,
    aniversariantesProfTodos,
    aniversariantesBaseTodos,
    alertasCalendario,
    alertasCompeticaoProf,
    alertasCompeticaoBase,
    alertasDocumentos,
    dmProf,
    dmBase,
    solicitacoesProf,
    solicitacoesBase,
    programacaoHoje,
  ] = await Promise.all([
    podeJogosProf ? buscarProximosJogos(supabase, categoriasProfissional, hojeStr) : Promise.resolve(null),
    podeJogosBase ? buscarProximosJogos(supabase, categoriasBase, hojeStr) : Promise.resolve(null),
    podeAtletasProf ? buscarContratosAVencer(supabase, categoriasProfissional, hojeStr) : Promise.resolve(null),
    podeAtletasBase ? buscarContratosAVencer(supabase, categoriasBase, hojeStr) : Promise.resolve(null),
    podeAniversariantesProf
      ? buscarAniversariantesDoMes(supabase, categoriasProfissional, hojeStr)
      : Promise.resolve(null),
    podeAniversariantesBase
      ? buscarAniversariantesDoMes(supabase, categoriasBase, hojeStr)
      : Promise.resolve(null),
    buscarAlertasCalendario(supabase, hojeStr),
    podeCompeticoesProf
      ? buscarAlertasCompeticao(supabase, "profissional", categoriasProfissional, hojeStr)
      : Promise.resolve([]),
    podeCompeticoesBase ? buscarAlertasCompeticao(supabase, "base", categoriasBase, hojeStr) : Promise.resolve([]),
    podeTermos ? buscarAlertasDocumentos(supabase, hojeStr) : Promise.resolve([]),
    podeDmProf ? buscarAtletasEmDm(supabase, categoriasProfissional) : Promise.resolve(null),
    podeDmBase ? buscarAtletasEmDm(supabase, categoriasBase) : Promise.resolve(null),
    podeSolicitacoesProf
      ? buscarSolicitacoesPendentes(supabase, "solicitacoes", master, userId)
      : Promise.resolve(null),
    podeSolicitacoesBase
      ? buscarSolicitacoesPendentes(supabase, "solicitacoes_base", master, userId)
      : Promise.resolve(null),
    // Programação de hoje nunca teve gate de módulo (ver lib/programacao/permissoes.ts) e já
    // aceita várias categorias numa chamada só — por isso, diferente dos outros blocos, não
    // precisa de uma chamada por departamento pra depois mesclar: passar as categorias dos dois
    // departamentos juntas já devolve a lista combinada, ordenada por horário.
    buscarProgramacaoDeHoje(supabase, [...categoriasProfissional, ...categoriasBase], hojeStr),
  ]);

  const aniversariantesProf = podeAniversariantesProf
    ? (aniversariantesProfTodos ?? []).filter(
        (a) => (a.origem === "atleta" && podeAtletasProf) || (a.origem === "comissao_tecnica" && podeComissaoProf),
      )
    : null;
  const aniversariantesBase = podeAniversariantesBase
    ? (aniversariantesBaseTodos ?? []).filter(
        (a) => (a.origem === "atleta" && podeAtletasBase) || (a.origem === "comissao_tecnica" && podeComissaoBase),
      )
    : null;

  const jogosTodos = mesclarBloco(jogosProf, jogosBase, multiplo);
  const jogos = jogosTodos
    ? {
        itens: [...jogosTodos]
          .sort((a, b) =>
            a.data_jogo === b.data_jogo
              ? (a.horario ?? "").localeCompare(b.horario ?? "")
              : a.data_jogo < b.data_jogo
                ? -1
                : 1,
          )
          .slice(0, 3),
        href: podeJogosProf ? "/jogos" : "/base/jogos",
      }
    : null;

  const contratosTodos = mesclarBloco(contratosProf, contratosBase, multiplo);
  const contratos = contratosTodos
    ? { itens: [...contratosTodos].sort((a, b) => (a.vigenciaFim < b.vigenciaFim ? -1 : 1)) }
    : null;

  const aniversariantesTodos = mesclarBloco(aniversariantesProf, aniversariantesBase, multiplo);
  const aniversariantes = aniversariantesTodos
    ? {
        itens: [...aniversariantesTodos].sort((a, b) =>
          a.dataNascimento.slice(8, 10) < b.dataNascimento.slice(8, 10) ? -1 : 1,
        ),
      }
    : null;

  const alertasCompeticaoTodos = multiplo
    ? [...marcar(alertasCompeticaoProf, "profissional"), ...marcar(alertasCompeticaoBase, "base")]
    : [...alertasCompeticaoProf, ...alertasCompeticaoBase];
  const alertas = {
    itens: [...alertasCalendario, ...alertasCompeticaoTodos, ...alertasDocumentos].sort(
      (a, b) => a.diasRestantes - b.diasRestantes,
    ),
  };

  const dmTodos = mesclarBloco(dmProf, dmBase, multiplo);
  const atletasDm = dmTodos ? { itens: dmTodos, href: "/atletas" } : null;

  const solicitacoesTodos = mesclarBloco(solicitacoesProf, solicitacoesBase, multiplo);
  const solicitacoes = solicitacoesTodos
    ? {
        itens: [...solicitacoesTodos]
          .sort((a, b) => {
            if (!a.prazoSugerido && !b.prazoSugerido) return 0;
            if (!a.prazoSugerido) return 1;
            if (!b.prazoSugerido) return -1;
            return a.prazoSugerido < b.prazoSugerido ? -1 : 1;
          })
          .slice(0, 5),
        href: podeSolicitacoesProf ? "/solicitacoes" : "/base/solicitacoes",
      }
    : null;

  return {
    jogos,
    contratos,
    aniversariantes,
    alertas,
    atletasDm,
    solicitacoes,
    programacaoHoje: {
      itens: programacaoHoje,
      href: temProfissional ? "/profissional/programacao" : "/base/programacao",
    },
    hojeStr,
    multiploDepartamento: multiplo,
  };
}
