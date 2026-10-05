import type { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import type { PerfilRow } from "@/lib/supabase/types";

export interface PessoaAcompanhadaInfo {
  nome: string;
  funcao: string;
  fotoUrl: string | null;
}

/**
 * Nome/função/foto de uma pessoa acompanhada no Painel de Demandas — mesma prioridade de sempre
 * (vínculo com a Comissão Técnica da Base > Profissional > `perfis.nome`/cargo, mesma regra de
 * `resolverNomeCargoParaAssinatura`), com foto incluída (que aquela função não resolve — é só pra
 * assinatura de documento, não pro avatar da tela). Compartilhado entre `/demandas` (visão geral)
 * e `/demandas/[id]` (detalhe de uma pessoa) pra não duplicar a mesma lógica nos dois.
 */
export async function resolverPessoaAcompanhada(
  supabase: ReturnType<typeof createClient>,
  perfil: PerfilRow,
): Promise<PessoaAcompanhadaInfo> {
  let nome = perfil.nome ?? perfil.email;
  let funcao = perfil.cargo ?? "—";
  let fotoPath: string | null = null;

  if (perfil.comissao_tecnica_base_id) {
    const { data } = await supabase
      .from("comissao_tecnica_base")
      .select("nome_completo, funcao, foto_path")
      .eq("id", perfil.comissao_tecnica_base_id)
      .maybeSingle();
    if (data) {
      nome = data.nome_completo;
      funcao = data.funcao;
      fotoPath = data.foto_path;
    }
  } else if (perfil.comissao_tecnica_id) {
    const { data } = await supabase
      .from("comissao_tecnica")
      .select("nome_completo, funcao, foto_path")
      .eq("id", perfil.comissao_tecnica_id)
      .maybeSingle();
    if (data) {
      nome = data.nome_completo;
      funcao = data.funcao;
      fotoPath = data.foto_path;
    }
  }

  const fotoUrl = await getSignedPhotoUrl(supabase, fotoPath);
  return { nome: nome ?? "—", funcao, fotoUrl };
}
