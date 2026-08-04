"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ConfigFpfFormState {
  error?: string;
}

export async function salvarConfigFpf(
  _prevState: ConfigFpfFormState,
  formData: FormData,
): Promise<ConfigFpfFormState> {
  const nomeExibicao = String(formData.get("nomeExibicao") ?? "").trim();
  const idCampeonato = Number(formData.get("idCampeonato"));
  const idCategoria = Number(formData.get("idCategoria"));
  const idClube = Number(formData.get("idClube"));
  const ano = Number(formData.get("ano"));

  if (!nomeExibicao) return { error: "Informe o nome de exibição da competição." };
  if (![idCampeonato, idCategoria, idClube, ano].every((n) => Number.isInteger(n) && n > 0)) {
    return { error: "Preencha todos os IDs e o ano com números válidos." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("fpf_config").upsert(
    {
      id: true,
      nome_exibicao: nomeExibicao,
      id_campeonato: idCampeonato,
      id_categoria: idCategoria,
      id_clube: idClube,
      ano,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) return { error: "Não foi possível salvar a configuração. Tente novamente." };

  revalidatePath("/jogos/fpf/configurar");
  revalidatePath("/jogos");
  return {};
}
