/**
 * Sincronização de jogos com a FPF (ver docs/superpowers/specs/2026-08-04-integracao-fpf-design.md,
 * seção "Fluxo: jogos"). Uma função só, reaproveitada pelo botão manual e pela rota diária
 * (`app/api/fpf/sincronizar/route.ts`).
 *
 * Não cria jogo novo sozinha — jogos da FPF ainda sem vínculo ficam pra revisão manual em
 * `/jogos/fpf/pendentes` (ver `buscarJogosPendentes`). Só atualiza jogos que já têm
 * `fpf_id_jogo` gravado (vínculo já confirmado antes).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { listarTodosOsJogosDoClube, type FpfJogo, FpfApiError } from "./client";
import type { FpfConfigRow, JogoRow } from "@/lib/supabase/types";

/** "31/07/2026" -> "2026-07-31" */
export function converterDataFpf(data: string): string {
  const [dia, mes, ano] = data.split("/");
  return `${ano}-${mes}-${dia}`;
}

/** "20h00" -> "20:00" */
export function converterHorarioFpf(horario: string): string {
  return horario.replace("h", ":");
}

export interface JogoFpfPreenchido {
  competicao: string;
  rodadaFase: string;
  adversarioNome: string;
  dataJogo: string;
  horario: string;
  localEstadio: string;
  endereco: string;
  mandante: boolean;
  golsPro: number | null;
  golsContra: number | null;
  fpfIdJogo: number;
  fpfLinkSumula: string | null;
}

/** Converte um jogo da FPF pro formato usado nos campos de `jogos` — usado tanto pra criar um jogo
 * novo (revisão manual) quanto pra atualizar um já vinculado.
 *
 * `FpfJogo` não traz o IdClube do mandante/visitante diretamente nos campos que capturamos — usa
 * o nome popular do Juventus (fixo, "Juventus SAF") pra decidir o lado, em vez do `idClubeJuventus`
 * numérico (mantido como parâmetro só por simetria com o resto do código, que sempre parametriza
 * por ID de clube). */
export function preencherJogoDaFpf(
  jogo: FpfJogo,
  idClubeJuventus: number,
  nomeExibicaoCompeticao: string,
): JogoFpfPreenchido {
  void idClubeJuventus;
  const juventusEhMandante = jogo.NomePopularMandante.trim().toLowerCase().includes("juventus");
  const adversarioNome = juventusEhMandante ? jogo.NomePopularVisitante : jogo.NomePopularMandante;
  const golsJuventus = juventusEhMandante ? jogo.ResultadoMandante : jogo.ResultadoVisitante;
  const golsAdversario = juventusEhMandante ? jogo.ResultadoVisitante : jogo.ResultadoMandante;

  const rodadaFasePartes = [jogo.Fase, jogo.Grupo ? `Grupo ${jogo.Grupo}` : null, `${jogo.Rodada}ª rodada`].filter(
    Boolean,
  );

  return {
    competicao: nomeExibicaoCompeticao,
    rodadaFase: rodadaFasePartes.join(" · "),
    adversarioNome,
    dataJogo: converterDataFpf(jogo.Data),
    horario: converterHorarioFpf(jogo.Horario),
    localEstadio: jogo.Estadio,
    endereco: jogo.Municipio,
    mandante: juventusEhMandante,
    golsPro: golsJuventus,
    golsContra: golsAdversario,
    fpfIdJogo: jogo.IdJogo,
    fpfLinkSumula: jogo.LinkSumula,
  };
}

export interface ResultadoSincronizacao {
  sucesso: boolean;
  jogosNovos: number;
  jogosAtualizados: number;
  mensagemErro: string | null;
}

/** Busca a configuração da integração — null se ainda não foi preenchida (tela "Configurar
 * integração FPF" precisa ser preenchida antes da primeira sincronização). */
export async function buscarConfigFpf(supabase: SupabaseClient): Promise<FpfConfigRow | null> {
  const { data } = await supabase.from("fpf_config").select("*").eq("id", true).maybeSingle();
  return (data as FpfConfigRow | null) ?? null;
}

/**
 * Sincroniza os jogos: atualiza os já vinculados (placar/data/horário/link de súmula), grava o
 * resultado em `fpf_sync_log`, e nunca apaga/sobrescreve nada em caso de erro — falha isolada,
 * sem derrubar dados já salvos (ver seção "Tratamento de erro e confiabilidade" da spec).
 */
export async function sincronizarJogosFpf(
  supabase: SupabaseClient,
  origem: "manual" | "automatica",
): Promise<ResultadoSincronizacao> {
  const config = await buscarConfigFpf(supabase);
  if (!config) {
    const resultado: ResultadoSincronizacao = {
      sucesso: false,
      jogosNovos: 0,
      jogosAtualizados: 0,
      mensagemErro: "Integração com a FPF ainda não foi configurada.",
    };
    await gravarLog(supabase, origem, resultado);
    return resultado;
  }

  let jogosFpf: FpfJogo[];
  try {
    jogosFpf = await listarTodosOsJogosDoClube({
      idCampeonato: config.id_campeonato,
      ano: config.ano,
      idClube: config.id_clube,
      idCategoria: config.id_categoria,
    });
  } catch (erro) {
    const mensagem = erro instanceof FpfApiError ? erro.message : "Erro desconhecido ao consultar a FPF.";
    const resultado: ResultadoSincronizacao = {
      sucesso: false,
      jogosNovos: 0,
      jogosAtualizados: 0,
      mensagemErro: mensagem,
    };
    await gravarLog(supabase, origem, resultado);
    return resultado;
  }

  const { data: jogosVinculadosData } = await supabase
    .from("jogos")
    .select("id, fpf_id_jogo, data_jogo, horario, gols_pro, gols_contra, local_estadio, fpf_link_sumula")
    .not("fpf_id_jogo", "is", null);
  const jogosVinculados = (jogosVinculadosData ?? []) as Pick<
    JogoRow,
    "id" | "fpf_id_jogo" | "data_jogo" | "horario" | "gols_pro" | "gols_contra" | "local_estadio" | "fpf_link_sumula"
  >[];
  const porFpfId = new Map(jogosVinculados.map((j) => [j.fpf_id_jogo, j]));

  let jogosAtualizados = 0;
  let jogosNovos = 0;
  const agora = new Date().toISOString();

  for (const jogoFpf of jogosFpf) {
    const existente = porFpfId.get(jogoFpf.IdJogo);
    if (!existente) {
      jogosNovos++;
      continue;
    }
    const preenchido = preencherJogoDaFpf(jogoFpf, config.id_clube, config.nome_exibicao);
    const mudou =
      existente.data_jogo !== preenchido.dataJogo ||
      existente.horario !== `${preenchido.horario}:00` ||
      existente.gols_pro !== preenchido.golsPro ||
      existente.gols_contra !== preenchido.golsContra ||
      existente.local_estadio !== preenchido.localEstadio ||
      existente.fpf_link_sumula !== preenchido.fpfLinkSumula;

    if (mudou) {
      await supabase
        .from("jogos")
        .update({
          data_jogo: preenchido.dataJogo,
          horario: preenchido.horario,
          gols_pro: preenchido.golsPro,
          gols_contra: preenchido.golsContra,
          local_estadio: preenchido.localEstadio,
          fpf_link_sumula: preenchido.fpfLinkSumula,
          fpf_sincronizado_em: agora,
        })
        .eq("id", existente.id);
      jogosAtualizados++;
    } else {
      await supabase.from("jogos").update({ fpf_sincronizado_em: agora }).eq("id", existente.id);
    }
  }

  const resultado: ResultadoSincronizacao = {
    sucesso: true,
    jogosNovos,
    jogosAtualizados,
    mensagemErro: null,
  };
  await gravarLog(supabase, origem, resultado);
  return resultado;
}

async function gravarLog(
  supabase: SupabaseClient,
  origem: "manual" | "automatica",
  resultado: ResultadoSincronizacao,
): Promise<void> {
  await supabase.from("fpf_sync_log").insert({
    origem,
    sucesso: resultado.sucesso,
    jogos_novos: resultado.jogosNovos,
    jogos_atualizados: resultado.jogosAtualizados,
    mensagem_erro: resultado.mensagemErro,
  });
}

/** Jogos da FPF ainda sem vínculo (`fpf_id_jogo` de nenhum jogo nosso bate) — pra tela de revisão
 * `/jogos/fpf/pendentes`. Recalculado ao vivo a cada acesso, sem tabela de staging (ver spec). */
export async function buscarJogosPendentes(
  supabase: SupabaseClient,
): Promise<{ config: FpfConfigRow | null; pendentes: JogoFpfPreenchido[] }> {
  const config = await buscarConfigFpf(supabase);
  if (!config) return { config: null, pendentes: [] };

  const [jogosFpf, { data: jogosVinculadosData }, { data: ignoradosData }] = await Promise.all([
    listarTodosOsJogosDoClube({
      idCampeonato: config.id_campeonato,
      ano: config.ano,
      idClube: config.id_clube,
      idCategoria: config.id_categoria,
    }),
    supabase.from("jogos").select("fpf_id_jogo").not("fpf_id_jogo", "is", null),
    supabase.from("fpf_jogos_ignorados").select("fpf_id_jogo"),
  ]);

  const idsVinculados = new Set(((jogosVinculadosData ?? []) as { fpf_id_jogo: number }[]).map((j) => j.fpf_id_jogo));
  const idsIgnorados = new Set(((ignoradosData ?? []) as { fpf_id_jogo: number }[]).map((j) => j.fpf_id_jogo));
  const pendentes = jogosFpf
    .filter((j) => !idsVinculados.has(j.IdJogo) && !idsIgnorados.has(j.IdJogo))
    .map((j) => preencherJogoDaFpf(j, config.id_clube, config.nome_exibicao));

  return { config, pendentes };
}
