"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { agruparLinhasPorSupervisor, calcularLayoutAutomatico, type OrganogramaNo } from "@/lib/futebol/organograma";
import type { OrganogramaNoFormState } from "@/components/organograma-editor";

const CAMINHO = "/base/comissao-tecnica/organograma";

/**
 * Ajusta `pos_x`/`pos_y` de todo mundo depois de qualquer criação/edição/troca de supervisor — duas
 * regras diferentes pra dois tipos de caixa (ver docs/superpowers/specs/2026-09-15-organograma-
 * cartoes-por-comissao-design.md, item 4):
 *
 * - Cartão AGRUPADO por `linha` (caixa com `grupo` E `linha`): nunca guarda posição na própria
 *   linha do `organograma_base` — desde que cartão passou a poder ser arrastado (pedido do Mateus de
 *   16/09), a posição manual dele mora em `organograma_base_linha.pos_x/pos_y/pos_manual` (uma por
 *   `linha`, não por pessoa). Se alguma dessas linhas ainda tiver `pos_x`/`pos_y` sobrando de uma
 *   versão anterior (congelada por engano), essa sobra é apagada aqui.
 * - Cartão SOLO (caixa com `grupo` mas SEM `linha`, caso raro/legado): funciona como uma liderança —
 *   arrastado manualmente (`pos_manual = true`) nunca é tocado aqui; sem arrasto manual, qualquer
 *   sobra de posição é zerada (volta a ser sempre calculado).
 * - Caixa de liderança arrastada manualmente (`pos_manual = true`, ver `moverNoOrganograma`): NUNCA é
 *   tocada aqui — é um arranjo de propósito do Mateus.
 * - Qualquer outra caixa de liderança (sem arrasto manual): recalculada JUNTO com todas as outras do
 *   mesmo tipo a cada criação/edição/troca de supervisor, não só a caixa nova — como a posição de
 *   cada uma depende de quantas outras (e cartões) existem no mesmo nível (ver
 *   `calcularLayoutAutomatico`), recalcular todas juntas garante que nunca se sobrepõem entre si; só
 *   grava quem de fato mudou de posição, pra não gerar updates (nem revalidação) à toa.
 */
async function ajustarPosicoesAutomaticas(supabase: ReturnType<typeof createClient>): Promise<void> {
  const [{ data }, { data: linhaData }] = await Promise.all([
    supabase.from("organograma_base").select("id, reporta_para, grupo, linha, ordem, pos_x, pos_y, pos_manual"),
    supabase.from("organograma_base_linha").select("linha, reporta_para"),
  ]);
  const linhas = (data ?? []) as {
    id: string;
    reporta_para: string | null;
    grupo: string | null;
    linha: string | null;
    ordem: number;
    pos_x: number | null;
    pos_y: number | null;
    pos_manual: boolean;
  }[];
  const linhaReportaParaMap = new Map(
    ((linhaData ?? []) as { linha: string; reporta_para: string | null }[]).map((l) => [l.linha, l.reporta_para]),
  );

  const ehCartaoAgrupado = (l: (typeof linhas)[number]) => Boolean(l.grupo && l.linha);
  const ehCartaoSolo = (l: (typeof linhas)[number]) => Boolean(l.grupo && !l.linha);
  const paraDescongelar = [
    // Cartão agrupado: nunca guarda posição na própria linha do `organograma_base` — sobra de antes
    // é sempre limpa, independente de `pos_manual` (a posição manual de verdade agora mora em
    // `organograma_base_linha`, mexida por `moverCartaoOrganograma`, não aqui).
    ...linhas.filter((l) => ehCartaoAgrupado(l) && (l.pos_x !== null || l.pos_y !== null || l.pos_manual)),
    // Cartão solo: mesma regra de uma liderança — só limpa sobra de quem NÃO foi arrastado.
    ...linhas.filter((l) => ehCartaoSolo(l) && !l.pos_manual && (l.pos_x !== null || l.pos_y !== null)),
  ];
  const paraRecalcular = linhas.filter((l) => !l.grupo && !l.pos_manual);

  const atualizacoes = paraDescongelar.map((l) =>
    supabase.from("organograma_base").update({ pos_x: null, pos_y: null, pos_manual: false }).eq("id", l.id),
  );

  if (paraRecalcular.length > 0) {
    const layout = calcularLayoutAutomatico(
      linhas.map(
        (l): OrganogramaNo => ({
          id: l.id,
          reportaPara: l.reporta_para,
          grupo: l.grupo,
          linha: l.linha,
          ordem: l.ordem,
        }),
      ),
      linhaReportaParaMap,
    );
    for (const l of paraRecalcular) {
      const pos = layout.posicoesLideranca.get(l.id);
      if (!pos) continue;
      const x = Math.round(pos.x);
      const y = Math.round(pos.y);
      if (x === l.pos_x && y === l.pos_y) continue;
      atualizacoes.push(supabase.from("organograma_base").update({ pos_x: x, pos_y: y }).eq("id", l.id));
    }
  }

  await Promise.all(atualizacoes);
}

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

function textoOuNull(formData: FormData, campo: string): string | null {
  const valor = texto(formData, campo);
  return valor === "" ? null : valor;
}

/**
 * Cria ou atualiza uma caixa do Organograma da Base (ver
 * docs/superpowers/specs/2026-08-23-organograma-base-design.md). Vinculando a uma pessoa da
 * Comissão Técnica, `nome`/`cargo` locais são zerados de propósito — a tela sempre mostra o nome/
 * função de lá pra essa caixa, então guardar os dois ao mesmo tempo só criaria risco de ficarem
 * desencontrados.
 */
export async function salvarNoOrganograma(
  _prevState: OrganogramaNoFormState,
  formData: FormData,
): Promise<OrganogramaNoFormState> {
  const id = textoOuNull(formData, "id");
  const comissaoTecnicaBaseId = textoOuNull(formData, "comissaoTecnicaBaseId");
  const nome = textoOuNull(formData, "nome");
  const cargo = textoOuNull(formData, "cargo");
  const grupo = textoOuNull(formData, "grupo");
  const linha = textoOuNull(formData, "linha");
  const reportaPara = textoOuNull(formData, "reportaPara");
  const ordemTexto = textoOuNull(formData, "ordem");
  const ordem = ordemTexto !== null ? Number(ordemTexto) : null;

  if (!comissaoTecnicaBaseId && !cargo) {
    return { error: "Escolha uma pessoa da Comissão Técnica ou preencha ao menos o cargo da caixa." };
  }
  if (reportaPara && id && reportaPara === id) {
    return { error: "Uma caixa não pode reportar pra ela mesma." };
  }

  const supabase = createClient();
  const dados = {
    comissao_tecnica_base_id: comissaoTecnicaBaseId,
    nome: comissaoTecnicaBaseId ? null : nome,
    cargo: comissaoTecnicaBaseId ? null : cargo,
    grupo,
    linha,
    reporta_para: reportaPara,
    ...(ordem !== null && !Number.isNaN(ordem) ? { ordem } : {}),
  };

  if (id) {
    const { error } = await supabase.from("organograma_base").update(dados).eq("id", id);
    if (error) return { error: `Não foi possível salvar: ${error.message}` };
  } else {
    const { count } = await supabase.from("organograma_base").select("id", { count: "exact", head: true });
    const { error } = await supabase
      .from("organograma_base")
      .insert({ ordem: count ?? 0, ...dados });
    if (error) return { error: `Não foi possível criar: ${error.message}` };
  }

  // Supervisor da comissão/departamento inteira — só vem preenchido no formulário quando é a
  // PRIMEIRA pessoa de uma linha nova (ver `PainelEdicao`/item 7 da spec); pra uma linha já
  // existente, o campo nem aparece, então `novaLinhaReportaPara` não chega aqui e o supervisor já
  // definido antes continua intacto.
  const novaLinhaReportaPara = formData.get("novaLinhaReportaPara");
  if (linha && novaLinhaReportaPara !== null) {
    const { error: erroLinha } = await supabase
      .from("organograma_base_linha")
      .upsert(
        { linha, reporta_para: String(novaLinhaReportaPara).trim() || null, updated_at: new Date().toISOString() },
        { onConflict: "linha" },
      );
    if (erroLinha) {
      return { error: `Caixa salva, mas não foi possível definir o supervisor dessa comissão/departamento: ${erroLinha.message}` };
    }
  }

  await ajustarPosicoesAutomaticas(supabase);
  revalidatePath(CAMINHO);
  return { success: true };
}

/**
 * Troca o supervisor de uma `linha` inteira (comissão/departamento) — campo "Essa comissão reporta
 * para" no painel de edição (ver item 2/7 da spec de 15/09). Separado de `salvarNoOrganograma`
 * porque é uma propriedade da LINHA, não de uma pessoa específica dela: muda de uma vez pra todo
 * mundo listado naquele cartão. Recalcula posições de liderança em seguida porque a largura da
 * subárvore de um supervisor depende de quantas comissões (cartões) reportam pra ele.
 */
export async function definirSupervisorLinha(linha: string, reportaPara: string | null): Promise<{ error?: string }> {
  if (!linha) return {};
  const supabase = createClient();
  const { error } = await supabase
    .from("organograma_base_linha")
    .upsert({ linha, reporta_para: reportaPara, updated_at: new Date().toISOString() }, { onConflict: "linha" });
  if (error) return { error: `Não foi possível salvar o supervisor: ${error.message}` };

  await ajustarPosicoesAutomaticas(supabase);
  revalidatePath(CAMINHO);
  return {};
}

/**
 * Move uma `linha` inteira da grade (ex.: "Comissão Sub20") um degrau pra cima ou pra baixo — chamada
 * direto pelo componente cliente, como `moverNoOrganograma`. É o jeito de reordenar cartão "na mão"
 * sem digitar número: como todas as colunas daquela linha viram juntas (o valor de `ordem` de cada
 * uma soma o mesmo deslocamento), a linha troca de posição com a vizinha sem desalinhar nada.
 *
 * A comparação/troca é só entre linhas do MESMO supervisor (`agruparLinhasPorSupervisor`), nunca a
 * lista inteira do organograma — como `posicionar()` só ordena filhos dentro do mesmo pai, trocar
 * `ordem` com a linha de OUTRO supervisor não muda nada visualmente (o botão parecia "não deixar"
 * reordenar) e ainda podia bagunçar a ordem de quem era irmã de verdade (pedido do Mateus de 16/09,
 * depois de Gustavo/Italo virarem supervisores separados).
 *
 * Devolve `{ error }` em vez de simplesmente não fazer nada quando alguma coisa falha — antes, um
 * erro do Supabase aqui desaparecia em silêncio (a `select` inicial ignorava `error`, e nenhum dos
 * `update` em paralelo era conferido), então clicar no botão "de verdade" não fazia nada e não tinha
 * como o Mateus saber se era um erro ou se o botão simplesmente não funcionava (spec de 27/08).
 */
export async function moverLinhaOrganograma(
  linha: string,
  direcao: "cima" | "baixo",
): Promise<{ error?: string }> {
  if (!linha) return {};
  const supabase = createClient();
  const [{ data, error: erroSelect }, { data: linhaData, error: erroLinhaData }] = await Promise.all([
    supabase.from("organograma_base").select("id, ordem, linha, grupo"),
    supabase.from("organograma_base_linha").select("linha, reporta_para"),
  ]);
  if (erroSelect) return { error: `Não foi possível mover: ${erroSelect.message}` };
  if (erroLinhaData) return { error: `Não foi possível mover: ${erroLinhaData.message}` };
  const nos = (data ?? []) as { id: string; ordem: number; linha: string | null; grupo: string | null }[];
  const linhaReportaParaMap = new Map(
    ((linhaData ?? []) as { linha: string; reporta_para: string | null }[]).map((l) => [l.linha, l.reporta_para]),
  );

  const grupos = agruparLinhasPorSupervisor(nos, linhaReportaParaMap);
  const ordenadas = [...grupos.values()].find((lista) => lista.includes(linha));
  if (!ordenadas) return { error: "Essa linha não foi encontrada — atualize a página e tente de novo." };

  const indiceAtual = ordenadas.indexOf(linha);
  const indiceAlvo = direcao === "cima" ? indiceAtual - 1 : indiceAtual + 1;
  if (indiceAlvo < 0 || indiceAlvo >= ordenadas.length) return {}; // já é a primeira/última do grupo, não faz nada

  const linhaAlvo = ordenadas[indiceAlvo];
  const nosA = nos.filter((n) => n.grupo && n.linha === linha);
  const nosB = nos.filter((n) => n.grupo && n.linha === linhaAlvo);
  const minA = Math.min(...nosA.map((n) => n.ordem));
  const minB = Math.min(...nosB.map((n) => n.ordem));
  const deslocamento = minB - minA;

  const resultados = await Promise.all([
    ...nosA.map((n) => supabase.from("organograma_base").update({ ordem: n.ordem + deslocamento }).eq("id", n.id)),
    ...nosB.map((n) => supabase.from("organograma_base").update({ ordem: n.ordem - deslocamento }).eq("id", n.id)),
  ]);
  const erro = resultados.find((r) => r.error);
  if (erro?.error) return { error: `Não foi possível mover: ${erro.error.message}` };

  revalidatePath(CAMINHO);
  return {};
}

/** Salva a posição arrastada. Chamada direto pelo componente cliente (não é um `<form>`), disparada
 * a cada soltar de arrasto.
 *
 * `pos_manual: true` marca essa posição como um arranjo de propósito — dali em diante,
 * `ajustarPosicoesAutomaticas` nunca mais recalcula essa caixa por conta de outra caixa sendo
 * criada/editada em qualquer canto do organograma (ver spec de 27/08).
 *
 * Devolve `{ error }` em vez de nada — antes, um erro do Supabase aqui desaparecia em silêncio: a
 * caixa continuava "arrastada" na tela (só na memória local do navegador), mas o banco nunca
 * recebia a posição nova, então o PDF (que sempre lê do banco, na hora de exportar) mostrava a
 * posição antiga — parecia que "a tela e o PDF ficam diferentes" sem motivo aparente. Junto com o
 * `useEffect` em `organograma-editor.tsx` que descarta a posição otimista assim que os dados do
 * servidor chegam de novo, agora ou os dois lados ficam iguais, ou o erro aparece pro Mateus. */
export async function moverNoOrganograma(id: string, x: number, y: number): Promise<{ error?: string }> {
  if (!id) return {};
  const supabase = createClient();
  const { error } = await supabase
    .from("organograma_base")
    .update({ pos_x: Math.round(x), pos_y: Math.round(y), pos_manual: true })
    .eq("id", id);
  if (error) return { error: `Não foi possível salvar a posição: ${error.message}` };
  revalidatePath(CAMINHO);
  return {};
}

/**
 * Salva a posição arrastada de um CARTÃO inteiro (comissão/departamento) — mesmo espírito de
 * `moverNoOrganograma`, mas pra `chave` de um cartão (ver `OrganogramaCartaoInfo.chave`) em vez do
 * id de uma pessoa. Pedido do Mateus de 16/09: antes só dava pra reordenar cartões do MESMO
 * supervisor (`moverLinhaOrganograma`); arrastar deixa colocar cartões de supervisores diferentes
 * lado a lado, na ordem que quiser, mesmo cada um mantendo o supervisor de verdade vinculado.
 *
 * `chave` começando com `"solo:"` é um cartão de 1 item só (caixa com `grupo` mas sem `linha`) — a
 * posição mora direto na própria caixa (`organograma_base.pos_x/pos_y`, mesma coluna de uma
 * liderança). Qualquer outra `chave` é a `linha` de verdade — a posição mora em
 * `organograma_base_linha.pos_x/pos_y` (uma por linha, vale pra comissão inteira, não por pessoa).
 * O `upsert` só nos 3 campos de posição nunca mexe em `reporta_para` de quem já tinha supervisor
 * definido (mesmo raciocínio de `definirSupervisorLinha`, que faz o inverso).
 */
export async function moverCartaoOrganograma(chave: string, x: number, y: number): Promise<{ error?: string }> {
  if (!chave) return {};
  const supabase = createClient();
  if (chave.startsWith("solo:")) {
    const id = chave.slice("solo:".length);
    const { error } = await supabase
      .from("organograma_base")
      .update({ pos_x: Math.round(x), pos_y: Math.round(y), pos_manual: true })
      .eq("id", id);
    if (error) return { error: `Não foi possível salvar a posição: ${error.message}` };
  } else {
    const { error } = await supabase.from("organograma_base_linha").upsert(
      {
        linha: chave,
        pos_x: Math.round(x),
        pos_y: Math.round(y),
        pos_manual: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "linha" },
    );
    if (error) return { error: `Não foi possível salvar a posição: ${error.message}` };
  }
  revalidatePath(CAMINHO);
  return {};
}

/**
 * "Reorganizar automaticamente" — solta TODAS as caixas E CARTÕES arrastados de volta pro layout
 * automático (por hierarquia/grupo/linha), como se nada tivesse sido arrastado ainda. Pedido do
 * Mateus depois de várias rodadas de teste terem deixado o organograma "uma bagunça" (caixas
 * arrastadas em cantos que já não faziam sentido, como o "Coordenador de Performance" perto da
 * liderança) — e, desde que cartão também passou a poder ser arrastado (16/09), vale pra ele também.
 * Só zera `pos_manual`/`pos_x`/`pos_y` de quem tinha arrasto salvo (caixa em `organograma_base`,
 * cartão agrupado em `organograma_base_linha`), e deixa `ajustarPosicoesAutomaticas` calcular tudo de
 * novo, do zero. Dali em diante o Mateus volta a arrastar só quem precisar — cada caixa/cartão
 * arrastado não é mais tocado aqui até a próxima vez que "Reorganizar automaticamente" for usado de
 * novo (mesma regra de sempre).
 */
export async function reorganizarOrganograma(): Promise<{ error?: string }> {
  const supabase = createClient();
  const [{ error: erroCaixas }, { error: erroCartoes }] = await Promise.all([
    supabase.from("organograma_base").update({ pos_x: null, pos_y: null, pos_manual: false }).eq("pos_manual", true),
    supabase
      .from("organograma_base_linha")
      .update({ pos_x: null, pos_y: null, pos_manual: false })
      .eq("pos_manual", true),
  ]);
  if (erroCaixas) return { error: `Não foi possível reorganizar: ${erroCaixas.message}` };
  if (erroCartoes) return { error: `Não foi possível reorganizar: ${erroCartoes.message}` };

  await ajustarPosicoesAutomaticas(supabase);
  revalidatePath(CAMINHO);
  return {};
}

/** Exclui a caixa. Não cascateia: quem reportava pra ela (`reporta_para`, `on delete set null`) fica
 * sem líder direto em vez de ser apagado junto — o painel já avisa quantas pessoas isso afeta antes
 * de confirmar.
 *
 * Usa o formato "com erro" do `DeleteButton` (em vez de "executa e esquece") — antes, um erro do
 * Supabase na exclusão desaparecia em silêncio: a linha continuava lá, mas a tela não avisava nada,
 * então parecia que o clique em "Sim, excluir" simplesmente não fazia nada. Agora qualquer erro
 * aparece pro Mateus em vez de sumir. */
export async function excluirNoOrganograma(
  _prevState: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const id = String(formData.get("id") ?? "");
  if (!id) return {};
  const supabase = createClient();
  const { error } = await supabase.from("organograma_base").delete().eq("id", id);
  if (error) return { error: `Não foi possível excluir: ${error.message}` };
  revalidatePath(CAMINHO);
  return {};
}
