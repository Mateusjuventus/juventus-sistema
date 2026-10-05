"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { demandaSchema, demandaStatusSchema } from "@/lib/validation/schemas";

export interface DemandaFormState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

/**
 * CRUD de Demandas — espelha `app/tarefas/actions.ts`, com três diferenças deliberadas: não existe
 * `categoria` (não se aplica aqui), `responsavel_id` NUNCA vem do formulário (sempre `auth.uid()` —
 * ninguém cria ou edita demanda de outra pessoa por aqui; é o Mateus que cadastra quem ele vai
 * acompanhar, lá em `/usuarios`, não "atribui" demandas pelo sistema), e não existe uma action de
 * editar título/descrição depois de criada — só trocar status ou excluir (ver docs/superpowers/
 * specs/2026-10-05-assistencia-social-e-demandas-design.md, Parte 2: o widget precisa ser rápido de
 * preencher, não um formulário completo de edição). `criarDemanda` não redireciona (ao contrário de
 * `createTarefa`) porque é usada tanto na tela cheia quanto no mini-form embutido no widget da tela
 * inicial — os dois ficam na mesma página depois de criar.
 */
export async function criarDemanda(
  _prevState: DemandaFormState,
  formData: FormData,
): Promise<DemandaFormState> {
  const raw = {
    titulo: String(formData.get("titulo") ?? ""),
    descricao: String(formData.get("descricao") ?? ""),
    prazo: String(formData.get("prazo") ?? ""),
  };
  const result = demandaSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const data = result.data;
  const { error } = await supabase.from("demandas").insert({
    titulo: data.titulo,
    descricao: data.descricao || null,
    prazo: data.prazo || null,
    responsavel_id: user.id,
  });
  if (error) return { error: "Não foi possível salvar a demanda. Tente novamente." };

  revalidatePath("/minhas-demandas");
  revalidatePath("/profissional");
  revalidatePath("/base");
  return { success: "Demanda criada." };
}

export async function deleteDemanda(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // `.eq("responsavel_id", user.id)` trava a exclusão na própria demanda — mesmo sem isso a RLS
  // (`authenticated_full_access`) deixaria passar, essa é a trava de verdade no nível da aplicação.
  await supabase.from("demandas").delete().eq("id", id).eq("responsavel_id", user.id);
  revalidatePath("/minhas-demandas");
  revalidatePath("/profissional");
  revalidatePath("/base");
}

/** Troca rápida de status (widget da tela inicial e tela cheia) — mesmo padrão de
 * `updateTarefaStatus`. */
export async function updateDemandaStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("status") ?? "");
  const result = demandaStatusSchema.safeParse({ status: raw });
  if (!result.success || !id) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("demandas")
    .update({ status: result.data.status })
    .eq("id", id)
    .eq("responsavel_id", user.id);
  revalidatePath("/minhas-demandas");
  revalidatePath("/profissional");
  revalidatePath("/base");
}
