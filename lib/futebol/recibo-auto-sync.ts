/**
 * Sincroniza automaticamente a linha do Recibo de Pagamento com quem está de fato confirmado numa
 * vaga de jogo — ver docs/superpowers/specs/2026-09-12-recibo-automatico-vagas-design.md.
 *
 * Antes disso, a tela de Recibo só sugeria marcar "Incluir" pra quem tinha vaga na PRIMEIRA vez que
 * a tela era aberta (antes de qualquer "Salvar"); depois do primeiro salvamento, cada vaga nova
 * pegada ou perdida exigia que o Mateus abrisse a tela de Recibo e marcasse/desmarcasse na mão — o
 * que ele relatou como o comportamento incômodo ("quando eu removo a pessoa da vaga... só
 * contabiliza quando ela desiste da vaga").
 *
 * Estas duas funções são chamadas direto dos pontos que mudam quem está confirmado numa vaga
 * (pegar vaga pelo link público, chamar da espera, desistir, remover pela tela de administração) —
 * tanto do Futebol Profissional quanto da Base, por isso recebem os nomes das tabelas como
 * parâmetro em vez de ficarem fixas num departamento só.
 */

import type { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";

// As ações que chamam isso usam ou o cliente admin (telas públicas, service_role) ou o cliente
// normal (telas de administração, sessão do usuário logado) — os dois têm a mesma forma
// (`.from(tabela).select/upsert/delete...`), só o construtor é diferente.
type ClienteComTabelas = ReturnType<typeof createAdminClient> | ReturnType<typeof createClient>;

interface TabelasReciboAutoSync {
  /** "staff_operacional" ou "staff_operacional_base". */
  staff: string;
  /** "recibos_jogo" ou "recibos_jogo_base". */
  recibos: string;
}

/**
 * Cria (ou atualiza, se por algum motivo já existir) a linha do recibo de alguém que acabou de
 * confirmar vaga — direto ao pegar, ou promovido da lista de espera. Usa os valores já cadastrados
 * no Staff Operacional (valor padrão, chave PIX, função) como default — os mesmos que a tela de
 * Recibo já sugeria manualmente. Não mexe em `pago`: se por acaso já existia uma linha (ex.: alguém
 * perdeu e pegou vaga de novo no mesmo jogo), o campo de pagamento não é tocado.
 */
export async function marcarReciboAutomatico(opts: {
  cliente: ClienteComTabelas;
  tabelas: TabelasReciboAutoSync;
  jogoId: string;
  staffId: string;
}): Promise<void> {
  const { cliente, tabelas, jogoId, staffId } = opts;

  const { data: pessoaData } = await cliente
    .from(tabelas.staff)
    .select("terceirizada, funcao_id, funcao_terceirizada_id, valor_padrao_pagamento, chave_pix, chave_pix_tipo")
    .eq("id", staffId)
    .maybeSingle();
  const pessoa = pessoaData as {
    terceirizada: boolean;
    funcao_id: string | null;
    funcao_terceirizada_id: string | null;
    valor_padrao_pagamento: number | null;
    chave_pix: string | null;
    chave_pix_tipo: string | null;
  } | null;
  if (!pessoa) return;

  const funcaoId = pessoa.terceirizada ? pessoa.funcao_terceirizada_id : pessoa.funcao_id;
  let funcaoNome: string | null = null;
  if (funcaoId) {
    const { data: funcaoData } = await cliente
      .from("staff_funcoes_catalogo")
      .select("nome")
      .eq("id", funcaoId)
      .maybeSingle();
    funcaoNome = (funcaoData as { nome: string } | null)?.nome ?? null;
  }

  const { error } = await cliente.from(tabelas.recibos).upsert(
    {
      jogo_id: jogoId,
      pessoa_tipo: "staff",
      pessoa_id: staffId,
      funcao_jogo: funcaoNome,
      valor: pessoa.valor_padrao_pagamento,
      chave_pix: pessoa.chave_pix,
      chave_pix_tipo: pessoa.chave_pix_tipo,
    },
    { onConflict: "jogo_id,pessoa_tipo,pessoa_id" },
  );
  if (error) console.error(`[recibo-auto-sync] falha ao marcar recibo (${tabelas.recibos}):`, staffId, error);
}

/** Apaga a linha do recibo de alguém que perdeu a vaga (desistiu, ou foi removido pela tela de
 * administração) — mesmo que já estivesse marcada como paga (decisão do Mateus: se a vaga não vale
 * mais, o recibo automático também não). */
export async function desmarcarReciboAutomatico(opts: {
  cliente: ClienteComTabelas;
  tabelaRecibos: string;
  jogoId: string;
  staffId: string;
}): Promise<void> {
  const { cliente, tabelaRecibos, jogoId, staffId } = opts;
  const { error } = await cliente
    .from(tabelaRecibos)
    .delete()
    .eq("jogo_id", jogoId)
    .eq("pessoa_tipo", "staff")
    .eq("pessoa_id", staffId);
  if (error) console.error(`[recibo-auto-sync] falha ao desmarcar recibo (${tabelaRecibos}):`, staffId, error);
}
