import type { createClient } from "@/lib/supabase/server";
import { diasEntre, type ItemMural } from "@/lib/futebol/calendario";
import { hojeBrasilia } from "@/lib/data-brasil";
import { carregarCompeticao, type CompeticaoCarregada } from "@/lib/futebol/competicao-query";
import type { CompeticaoRow } from "@/lib/supabase/types";

/**
 * Alertas das competições pro Mural da Home (`app/profissional/page.tsx`) e pra tela de Avisos —
 * consequência dos dados que já existem (súmulas → motor de regras → suspensões/pendurados;
 * prazos da competição), nunca de cadastro manual de alerta (ver spec 2026-08-10-competicoes).
 * Devolve `ItemMural` pra encaixar no widget que a Home já tem, sem componente novo.
 */

const COR_SUSPENSAO = "#B4232C";
const COR_ATENCAO = "#B98F1E";

/** Itens de Mural de UMA competição já carregada — separado de `carregarAvisosCompeticoes` pra
 * tela `/competicoes/[id]/alertas` reaproveitar sem nova consulta. */
export function avisosDaCompeticao(carregada: CompeticaoCarregada, hojeStr: string): ItemMural[] {
  const { competicao, disciplina, jogosOrdenados, atletasById, prazos } = carregada;
  const itens: ItemMural[] = [];

  const proximoJogo = jogosOrdenados.find((j) => j.data >= hojeStr) ?? null;

  // Suspensões ativas — cada uma vira um aviso apontando o próximo jogo em que o atleta cumpre.
  for (const s of disciplina.suspensoes) {
    if (s.status !== "ativa") continue;
    const nome = atletasById.get(s.atletaId)?.nome_completo ?? "Atleta";
    const jogoCumprir = s.proximoJogoCumprirId
      ? jogosOrdenados.find((j) => j.jogoId === s.proximoJogoCumprirId) ?? null
      : null;
    const restante = s.jogosRestantes === 1 ? "1 jogo restante" : `${s.jogosRestantes} jogos restantes`;
    itens.push({
      titulo: `Suspenso: ${nome} (${restante})`,
      subtitulo: `${competicao.nome} · ${s.motivo}`,
      cor: COR_SUSPENSAO,
      diasRestantes: jogoCumprir ? Math.max(0, diasEntre(hojeStr, jogoCumprir.data)) : 0,
      urgencia: "urgente",
      href: `/competicoes/${competicao.id}/suspensoes`,
    });
  }

  // Pendurados — só interessa enquanto existe jogo por vir na competição.
  if (proximoJogo) {
    for (const c of disciplina.cartoes) {
      if (!c.pendurado) continue;
      const nome = atletasById.get(c.atletaId)?.nome_completo ?? "Atleta";
      itens.push({
        titulo: `Pendurado: ${nome} (${c.amarelosAtivos} amarelos)`,
        subtitulo: `${competicao.nome} · o próximo gera suspensão`,
        cor: COR_ATENCAO,
        diasRestantes: Math.max(0, diasEntre(hojeStr, proximoJogo.data)),
        urgencia: "atencao",
        href: `/competicoes/${competicao.id}/cartoes`,
      });
    }
  }

  // Condição de jogo do próximo jogo vinculado — um aviso agregado quando há suspenso pra ele.
  if (proximoJogo) {
    const suspensosNoJogo = disciplina.suspensoes.filter(
      (s) => s.status === "ativa" && s.jogosCumprir.includes(proximoJogo.jogoId),
    );
    if (suspensosNoJogo.length > 0) {
      const qtd = suspensosNoJogo.length;
      itens.push({
        titulo: qtd === 1 ? "1 atleta suspenso no próximo jogo" : `${qtd} atletas suspensos no próximo jogo`,
        subtitulo: `${competicao.nome} · ${proximoJogo.confronto}`,
        cor: COR_SUSPENSAO,
        diasRestantes: Math.max(0, diasEntre(hojeStr, proximoJogo.data)),
        urgencia: "urgente",
        href: `/competicoes/${competicao.id}/condicao?jogoId=${proximoJogo.jogoId}`,
      });
    }
  }

  // Análise do adversário do próximo jogo (pedido do Mateus): posição e disciplina do rival no
  // grupo — CA/CV contados no escopo do grupo/fase (zera entre fases naturalmente, cada fase tem
  // seus próprios grupos). Dados pra avaliar o adversário, não pra agir.
  if (proximoJogo) {
    const vinculoProximo = carregada.vinculos.find((v) => v.jogo_id === proximoJogo.jogoId);
    const jogoProximo = carregada.jogosById.get(proximoJogo.jogoId);
    if (vinculoProximo?.grupo_id && jogoProximo) {
      const classificacao = carregada.classificacoesPorGrupo.get(vinculoProximo.grupo_id) ?? [];
      const posicao = classificacao.findIndex(
        (l) => l.equipe.trim().toLocaleLowerCase("pt-BR") === jogoProximo.adversario_nome.trim().toLocaleLowerCase("pt-BR"),
      );
      if (posicao !== -1) {
        const linha = classificacao[posicao];
        const nomeGrupo = carregada.nomesGrupos.get(vinculoProximo.grupo_id) ?? "grupo";
        itens.push({
          titulo: `Adversário: ${linha.equipe} — ${posicao + 1}º do ${nomeGrupo}`,
          subtitulo: `${linha.pontos} pts · ${linha.cartoesAmarelos} CA · ${linha.cartoesVermelhos} CV na fase`,
          cor: COR_ATENCAO,
          diasRestantes: Math.max(0, diasEntre(hojeStr, proximoJogo.data)),
          urgencia: "ok",
          href: `/competicoes/${competicao.id}/classificacao`,
        });
      }
    }
  }

  // Prazos da competição — mesma janela de 10 dias do resto do Mural.
  for (const p of prazos) {
    if (p.concluido) continue;
    const dias = diasEntre(hojeStr, p.data_fim);
    if (dias < 0 || dias > 10) continue;
    itens.push({
      titulo: p.titulo,
      subtitulo: `${competicao.nome} · prazo`,
      cor: COR_ATENCAO,
      diasRestantes: dias,
      urgencia: dias <= 2 ? "urgente" : dias <= 5 ? "atencao" : "ok",
      href: `/competicoes/${competicao.id}/prazos`,
    });
  }

  return itens.sort((a, b) => a.diasRestantes - b.diasRestantes);
}

/** Avisos de TODAS as competições em andamento — usado pela Home e pela tela de Avisos. */
export async function carregarAvisosCompeticoes(
  supabase: ReturnType<typeof createClient>,
): Promise<ItemMural[]> {
  const hojeStr = hojeBrasilia();
  const { data } = await supabase.from("competicoes").select("id").eq("status", "em_andamento");
  const ids = ((data ?? []) as Pick<CompeticaoRow, "id">[]).map((c) => c.id);

  const carregadas = await Promise.all(ids.map((id) => carregarCompeticao(supabase, id)));
  return carregadas
    .filter((c): c is CompeticaoCarregada => c !== null)
    .flatMap((c) => avisosDaCompeticao(c, hojeStr))
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}
