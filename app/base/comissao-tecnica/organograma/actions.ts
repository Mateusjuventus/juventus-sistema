"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calcularLayoutAutomatico, type OrganogramaNo } from "@/lib/futebol/organograma";
import type { OrganogramaNoFormState } from "@/components/organograma-editor";

const CAMINHO = "/base/comissao-tecnica/organograma";

/**
 * Ajusta `pos_x`/`pos_y` de todo mundo depois de qualquer criação/edição — três regras diferentes
 * pra três tipos de caixa:
 *
 * - Célula de grade (Grupo E Linha preenchidos): NUNCA tem posição salva — sempre usa o cálculo
 *   automático da grade (ver `lib/futebol/organograma.ts`), então ela nunca sai do alinhamento por
 *   arrasto (a tela nem deixa mais arrastar essas). Se alguma já tinha `pos_x`/`pos_y` de antes
 *   (arrastada ou congelada por uma versão anterior desta função), essa posição é apagada aqui —
 *   ela "volta" pra grade.
 * - Caixa arrastada manualmente (`pos_manual = true`, ver `moverNoOrganograma`): NUNCA é tocada
 *   aqui, mesmo que uma caixa nova apareça do lado dela — é um arranjo de propósito do Mateus.
 * - Qualquer outra caixa (liderança, ou Grupo sem Linha, sem arrasto manual): recalculada JUNTO com
 *   todas as outras do mesmo tipo a cada criação/edição, não só a caixa nova. Uma versão anterior
 *   só recalculava a caixa recém-criada e "congelava" as demais como estavam — como a posição de
 *   cada caixa depende de quantas outras existem no mesmo nível (ver `calcularLayoutAutomatico`),
 *   isso podia fazer a caixa nova cair EM CIMA de uma caixa já existente, sem ninguém perceber até
 *   reparar que uma "sumiu" da tela (escondida atrás de outra) ou até exportar o PDF e ver as duas
 *   sobrepostas (spec de 27/08 — bug real reportado pelo Mateus). Recalcular todas juntas garante
 *   que essas caixas nunca se sobrepõem entre si; só grava quem de fato mudou de posição, pra não
 *   gerar updates (nem revalidação) à toa.
 */
async function ajustarPosicoesAutomaticas(supabase: ReturnType<typeof createClient>): Promise<void> {
  const { data } = await supabase
    .from("organograma_base")
    .select("id, reporta_para, grupo, linha, ordem, pos_x, pos_y, pos_manual");
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

  const naGrade = (l: (typeof linhas)[number]) => Boolean(l.grupo && l.linha);
  const paraDescongelar = linhas.filter(
    (l) => naGrade(l) && (l.pos_x !== null || l.pos_y !== null || l.pos_manual),
  );
  const paraRecalcular = linhas.filter((l) => !naGrade(l) && !l.pos_manual);

  const atualizacoes = paraDescongelar.map((l) =>
    supabase.from("organograma_base").update({ pos_x: null, pos_y: null, pos_manual: false }).eq("id", l.id),
  );

  if (paraRecalcular.length > 0) {
    const layout = calcularLayoutAutomatico(
      linhas.map(
        (l): OrganogramaNo => ({ id: l.id, reportaPara: l.reporta_para, grupo: l.grupo, linha: l.linha, ordem: l.ordem }),
      ),
    );
    for (const l of paraRecalcular) {
      const pos = layout.get(l.id);
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

  await ajustarPosicoesAutomaticas(supabase);
  revalidatePath(CAMINHO);
  return { success: true };
}

/**
 * Move uma `linha` inteira da grade (ex.: "Comissão Sub20") um degrau pra cima ou pra baixo entre
 * as outras linhas — chamada direto pelo componente cliente, como `moverNoOrganograma`. É o jeito de
 * reordenar célula de grade "na mão" sem digitar número: como todas as colunas daquela linha viram
 * juntas (o valor de `ordem` de cada uma soma o mesmo deslocamento), a linha troca de posição com a
 * vizinha sem desalinhar nada.
 */
export async function moverLinhaOrganograma(linha: string, direcao: "cima" | "baixo"): Promise<void> {
  if (!linha) return;
  const supabase = createClient();
  const { data } = await supabase
    .from("organograma_base")
    .select("id, ordem, linha, grupo")
    .not("grupo", "is", null)
    .not("linha", "is", null);
  const nos = (data ?? []) as { id: string; ordem: number; linha: string; grupo: string }[];

  const porLinha = new Map<string, typeof nos>();
  for (const n of nos) porLinha.set(n.linha, [...(porLinha.get(n.linha) ?? []), n]);

  // Mesma regra de ordenação de linha que `calcularLayoutAutomatico` usa: menor `ordem` entre quem
  // usa aquela linha, em qualquer coluna.
  const ordenadas = [...porLinha.entries()].sort(
    (a, b) => Math.min(...a[1].map((n) => n.ordem)) - Math.min(...b[1].map((n) => n.ordem)),
  );
  const indiceAtual = ordenadas.findIndex(([l]) => l === linha);
  if (indiceAtual === -1) return;
  const indiceAlvo = direcao === "cima" ? indiceAtual - 1 : indiceAtual + 1;
  if (indiceAlvo < 0 || indiceAlvo >= ordenadas.length) return; // já é a primeira/última, não faz nada

  const [, nosA] = ordenadas[indiceAtual];
  const [, nosB] = ordenadas[indiceAlvo];
  const minA = Math.min(...nosA.map((n) => n.ordem));
  const minB = Math.min(...nosB.map((n) => n.ordem));
  const deslocamento = minB - minA;

  await Promise.all([
    ...nosA.map((n) => supabase.from("organograma_base").update({ ordem: n.ordem + deslocamento }).eq("id", n.id)),
    ...nosB.map((n) => supabase.from("organograma_base").update({ ordem: n.ordem - deslocamento }).eq("id", n.id)),
  ]);
  revalidatePath(CAMINHO);
}

/** Salva a posição arrastada. Chamada direto pelo componente cliente (não é um `<form>`), disparada
 * a cada soltar de arrasto — por isso não devolve estado nenhum pra tela, só grava.
 *
 * `pos_manual: true` marca essa posição como um arranjo de propósito — dali em diante,
 * `ajustarPosicoesAutomaticas` nunca mais recalcula essa caixa por conta de outra caixa sendo
 * criada/editada em qualquer canto do organograma (ver spec de 27/08). */
export async function moverNoOrganograma(id: string, x: number, y: number): Promise<void> {
  if (!id) return;
  const supabase = createClient();
  await supabase
    .from("organograma_base")
    .update({ pos_x: Math.round(x), pos_y: Math.round(y), pos_manual: true })
    .eq("id", id);
  revalidatePath(CAMINHO);
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
