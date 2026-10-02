import type { createClient } from "@/lib/supabase/server";

export interface NomeCargoResolvido {
  nome: string | null;
  cargo: string | null;
}

interface PerfilComVinculos {
  nome: string | null;
  cargo: string | null;
  comissao_tecnica_id: string | null;
  comissao_tecnica_base_id: string | null;
}

/**
 * Nome/função a usar na hora de ASSINAR um documento, ou de exibir em `/minha-conta` — ver
 * docs/superpowers/specs/2026-09-13-acesso-por-categoria-comissao-tecnica-design.md. Antes desta
 * mudança, `assinarDocumento`/`autoAssinarComoCreator` liam `perfil.nome`/`perfil.cargo` direto;
 * agora, quando a conta está vinculada a um registro da Comissão Técnica, a fonte de verdade passa
 * a ser esse registro — editá-lo lá atualiza a assinatura na hora, sem precisar mexer no login.
 *
 * Prioridade: vínculo com a Comissão Técnica do Futebol de Base > vínculo com a do Futebol
 * Profissional > `perfis.nome`/`cargo` de sempre (sem nenhum vínculo). Se os dois vínculos
 * estiverem preenchidos ao mesmo tempo (não deveria acontecer em uso normal), o da Base ganha —
 * mesma prioridade usada por `getCategoriasBasePermitidas`.
 *
 * O resultado ainda é um SNAPSHOT gravado por quem chama esta função (`nome_no_momento`/
 * `cargo_no_momento` em `assinaturas_documento`) — trocar o cadastro vinculado depois não muda
 * documentos já assinados, mesmo princípio que já vale pra troca da assinatura desenhada/anexada.
 */
export async function resolverNomeCargoParaAssinatura(
  supabase: ReturnType<typeof createClient>,
  perfil: PerfilComVinculos,
): Promise<NomeCargoResolvido> {
  if (perfil.comissao_tecnica_base_id) {
    const { data } = await supabase
      .from("comissao_tecnica_base")
      .select("nome_completo, funcao")
      .eq("id", perfil.comissao_tecnica_base_id)
      .maybeSingle();
    if (data) return { nome: data.nome_completo, cargo: data.funcao };
  }

  if (perfil.comissao_tecnica_id) {
    const { data } = await supabase
      .from("comissao_tecnica")
      .select("nome_completo, funcao")
      .eq("id", perfil.comissao_tecnica_id)
      .maybeSingle();
    if (data) return { nome: data.nome_completo, cargo: data.funcao };
  }

  return { nome: perfil.nome, cargo: perfil.cargo };
}

/**
 * Pro papel "treinador", o vínculo com a Comissão Técnica (Base) é OBRIGATÓRIO pra assinar
 * qualquer coisa — ver docs/superpowers/specs/2026-10-02-assinatura-treinador-design.md. Diferente
 * dos outros papéis (que caem num nome preenchido na mão em `/minha-conta` quando não vinculados),
 * a conta de um Treinador nunca tem campo de nome manual, então sem vínculo ela nunca resolve nome
 * nenhum — `app/usuarios` já impede criar/editar um login de Treinador sem escolher essa pessoa,
 * mas quem já existia antes dessa mudança pode estar sem vínculo, por isso as telas que deixam o
 * Treinador assinar (`app/treinador/actions.ts`, `app/treinador/atletas/[id]/dispensa/page.tsx`)
 * conferem isto antes, com uma mensagem clara em vez de deixar sair um documento assinado com o
 * e-mail no lugar do nome.
 */
export function treinadorPossuiVinculoObrigatorio(perfil: {
  comissao_tecnica_base_id: string | null;
}): boolean {
  return Boolean(perfil.comissao_tecnica_base_id);
}
