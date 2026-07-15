"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Liga/desliga o link público de autocadastro de Staff Operacional (/cadastro-staff). Roda com a
 * sessão autenticada normal do usuário logado — só quem está logado no sistema consegue mudar isso
 * (a página pública só consegue LER esse valor, via service_role key, nunca alterar).
 */
export async function alternarCadastroPublico(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const novoValor = String(formData.get("novoValor") ?? "") === "true";
  if (!id) return;

  const supabase = createClient();
  await supabase
    .from("configuracoes_cadastro_staff")
    .update({ cadastro_publico_ativo: novoValor })
    .eq("id", id);

  revalidatePath("/staff-operacional");
  revalidatePath("/cadastro-staff");
}
