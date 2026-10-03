import { diasEntre, type ItemMural } from "@/lib/futebol/calendario";
import type { CompeticaoBaseCarregada } from "@/lib/futebol/competicao-query-base";

/**
 * Espelha `avisosDaCompeticao` de `lib/futebol/competicao-avisos.ts` (Profissional) para o
 * Futebol de Base — ver docs/superpowers/specs/2026-10-03-competicoes-base-design.md. Precisou de
 * um arquivo próprio (em vez de reaproveitar o original direto, como a spec havia previsto):
 * `avisosDaCompeticao` tem os `href` dos alertas hard-coded pra `/competicoes/...`, que levariam
 * pras telas do Profissional — corrigido aqui durante a implementação, apontando pra
 * `/base/competicoes/...`. `carregarAvisosCompeticoes` (hard-coded Profissional, usado só pelo
 * Mural) continua não portado — fora de escopo, a Home da Base não tem Mural.
 */

const COR_SUSPENSAO = "#B4232C";
const COR_ATENCAO = "#B98F1E";

/** Itens de alerta de UMA competição da Base já carregada — usado pela aba Alertas e pela Visão
 * geral (lista reduzida). */
export function avisosDaCompeticaoBase(carregada: CompeticaoBaseCarregada, hojeStr: string): ItemMural[] {
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
      href: `/base/competicoes/${competicao.id}/suspensoes`,
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
        href: `/base/competicoes/${competicao.id}/cartoes`,
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
        href: `/base/competicoes/${competicao.id}/condicao?jogoId=${proximoJogo.jogoId}`,
      });
    }
  }

  // Análise do adversário do próximo jogo: posição e disciplina do rival no grupo — CA/CV
  // contados no escopo do grupo/fase.
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
          href: `/base/competicoes/${competicao.id}/classificacao`,
        });
      }
    }
  }

  // Prazos da competição — mesma janela de 10 dias do Profissional.
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
      href: `/base/competicoes/${competicao.id}/prazos`,
    });
  }

  return itens.sort((a, b) => a.diasRestantes - b.diasRestantes);
}
