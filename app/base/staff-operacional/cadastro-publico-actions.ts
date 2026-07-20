"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Liga/desliga o link público de autocadastro de Staff Operacional do Futebol de Base
 * (/cadastro-staff-base) — espelha `app/staff-operacional/cadastro-publico-actions.ts`, mas grava
 * em `configuracoes_cadastro_staff_base`, totalmente independente da configuração do Profissional.
 * Roda com a sessão autenticada normal; a página pública só LÊ esse valor via service_role key.
 */
export async function alternarCadastroPublicoBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const novoValor = String(formData.get("novoValor") ?? "") === "true";
  if (!id) return;

  const supabase = createClient();
  await supabase
    .from("configuracoes_cadastro_staff_base")
    .update({ cadastro_publico_ativo: novoValor })
    .eq("id", id);

  revalidatePath("/base/staff-operacional");
  revalidatePath("/cadastro-staff-base");
}
