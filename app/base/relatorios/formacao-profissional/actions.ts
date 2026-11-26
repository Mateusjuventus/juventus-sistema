"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMaster } from "@/lib/auth/role";
import { nomeDaContaAtual } from "@/lib/auth/perfis";

const CAMINHO = "/base/relatorios/formacao-profissional";

/**
 * Cria (ou substitui — upsert por `atleta_id`, a tabela só permite uma exceção ativa por atleta) uma
 * exceção manual da Relação de Atletas (Formação e Profissional) — ver docs/superpowers/specs/
 * 2026-11-26-relacao-formacao-profissional-design.md. "incluir" traz pra relação alguém que o
 * critério automático não pegaria; "excluir" tira alguém que o critério automático pegaria. Só
 * master (checagem sempre no servidor, nunca só esconder o botão no client).
 */
export async function criarExcecao(formData: FormData): Promise<void> {
  const supabase = createClient();
  if (!(await isMaster(supabase))) return;

  const atletaId = String(formData.get("atletaId") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  if (!atletaId || (tipo !== "incluir" && tipo !== "excluir")) return;

  const admin = createAdminClient();
  await admin.from("atleta_relacao_formacao_profissional_excecoes").upsert(
    {
      atleta_id: atletaId,
      tipo,
      criado_por_nome: await nomeDaContaAtual(supabase),
    },
    { onConflict: "atleta_id" },
  );
  revalidatePath(CAMINHO);
}

/** Remove a exceção do atleta (se existir) — volta ao comportamento 100% automático pra ele. Só
 * master. */
export async function removerExcecao(formData: FormData): Promise<void> {
  const supabase = createClient();
  if (!(await isMaster(supabase))) return;

  const atletaId = String(formData.get("atletaId") ?? "");
  if (!atletaId) return;

  const admin = createAdminClient();
  await admin.from("atleta_relacao_formacao_profissional_excecoes").delete().eq("atleta_id", atletaId);
  revalidatePath(CAMINHO);
}
