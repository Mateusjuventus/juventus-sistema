"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasTreinador } from "@/lib/auth/role";
import { nomeDaContaAtual } from "@/lib/auth/perfis";
import { atletaAnotacaoSchema } from "@/lib/validation/schemas";

/**
 * Salva a Classificação (G1/G2/G3) de um atleta do elenco, a partir da seção "Meus atletas" do
 * Treinador (ver docs/superpowers/specs/2026-08-25-classificacao-dispensa-atleta-base-design.md,
 * seção 2) — mesmo padrão de "ação simples sem `useFormState`" já usado em
 * `alternarFichaCadastroAtletaBase` (app/base/atletas/actions.ts). Dupla checagem de permissão:
 * `getCategoriasTreinador` só devolve algo pra quem está logado como "treinador", e a categoria do
 * atleta é conferida contra as categorias liberadas pra esse treinador — mesma dupla checagem já
 * feita em `salvarParecerCaptacao`.
 */
export async function salvarClassificacaoTreinador(formData: FormData): Promise<void> {
  const supabase = createClient();
  const categorias = await getCategoriasTreinador(supabase);
  if (categorias.length === 0) return;

  const atletaId = String(formData.get("atletaId") ?? "");
  if (!atletaId) return;

  const classificacaoRaw = String(formData.get("classificacao") ?? "");
  // "dispensa" ("Dispensa (pendente)") é a única opção nova que o treinador ganha — ver
  // docs/superpowers/specs/2026-09-02-campograma-edicao-rapida-design.md. É só um sinalizador; não
  // muda `status` (só o Relatório de Dispensa formal faz isso).
  const classificacao = ["g1", "g2", "g3", "dispensa"].includes(classificacaoRaw) ? classificacaoRaw : null;

  const { data: atleta } = await supabase
    .from("atletas_base")
    .select("categoria")
    .eq("id", atletaId)
    .maybeSingle();
  if (!atleta?.categoria || !categorias.includes(atleta.categoria)) return;

  await supabase.from("atletas_base").update({ classificacao }).eq("id", atletaId);

  revalidatePath("/treinador");
  revalidatePath("/base/atletas");
}

export interface AnotacaoFormState {
  error?: string;
  success?: boolean;
}

/** Anotação criada pelo Treinador, a partir da página `/treinador/atletas/[id]` — mesma dupla
 * checagem de categoria de `salvarClassificacaoTreinador`. Sem ação de apagar: o Treinador só cria
 * (ver docs/superpowers/specs/2026-10-27-ficha-atleta-dossie-anotacoes-design.md, "Exclusão"). */
export async function adicionarAnotacaoTreinador(
  _prevState: AnotacaoFormState,
  formData: FormData,
): Promise<AnotacaoFormState> {
  const supabase = createClient();
  const categorias = await getCategoriasTreinador(supabase);
  if (categorias.length === 0) return { error: "Sessão expirada. Faça login novamente." };

  const atletaId = String(formData.get("atletaId") ?? "");
  if (!atletaId) return { error: "Atleta não identificado. Recarregue a página e tente novamente." };

  const result = atletaAnotacaoSchema.safeParse({ texto: String(formData.get("texto") ?? "") });
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Dados inválidos." };

  const { data: atleta } = await supabase
    .from("atletas_base")
    .select("categoria")
    .eq("id", atletaId)
    .maybeSingle();
  if (!atleta?.categoria || !categorias.includes(atleta.categoria)) {
    return { error: "Você não tem acesso a este atleta." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nomeAtual = await nomeDaContaAtual(supabase);

  const { error } = await supabase.from("atleta_base_anotacoes").insert({
    atleta_id: atletaId,
    texto: result.data.texto,
    criado_por_perfil_id: user?.id ?? null,
    criado_por_nome: nomeAtual,
  });

  if (error) return { error: "Não foi possível salvar a anotação. Tente novamente." };

  revalidatePath(`/treinador/atletas/${atletaId}`);
  return { success: true };
}
