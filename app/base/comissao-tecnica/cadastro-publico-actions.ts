"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Liga/desliga o link público de autocadastro da Comissão Técnica/Diretoria — Futebol de Base
 * (/cadastro-comissao-tecnica-base) — espelha `app/comissao-tecnica/cadastro-publico-actions.ts`,
 * mas grava em `configuracoes_cadastro_comissao_tecnica_base`, totalmente independente da
 * configuração do Profissional. Roda com a sessão autenticada normal; a página pública só LÊ esse
 * valor via service_role key.
 */
export async function alternarCadastroPublicoComissaoTecnicaBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const novoValor = String(formData.get("novoValor") ?? "") === "true";
  if (!id) return;

  const supabase = createClient();
  await supabase
    .from("configuracoes_cadastro_comissao_tecnica_base")
    .update({ cadastro_publico_ativo: novoValor })
    .eq("id", id);

  revalidatePath("/base/comissao-tecnica");
  revalidatePath("/cadastro-comissao-tecnica-base");
}
