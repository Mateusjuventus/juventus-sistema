"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ehTarefaCategoriaValida } from "@/lib/auth/tarefas-categorias";
import { tarefaSchema, tarefaStatusSchema } from "@/lib/validation/schemas";

export interface TarefaFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

function parseForm(formData: FormData) {
  const raw = {
    titulo: String(formData.get("titulo") ?? ""),
    descricao: String(formData.get("descricao") ?? ""),
    categoria: String(formData.get("categoria") ?? ""),
    status: String(formData.get("status") ?? "pendente"),
    prazo: String(formData.get("prazo") ?? ""),
  };

  const result = tarefaSchema.safeParse(raw);
  return { raw, result };
}

export async function createTarefa(
  _prevState: TarefaFormState,
  formData: FormData,
): Promise<TarefaFormState> {
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const data = result.data;

  const { error } = await supabase.from("tarefas").insert({
    titulo: data.titulo,
    descricao: data.descricao || null,
    categoria: data.categoria,
    status: data.status,
    prazo: data.prazo || null,
  });

  if (error) return { error: "Não foi possível salvar a tarefa. Tente novamente.", values: raw };

  revalidatePath("/tarefas");
  redirect(`/tarefas?categoria=${data.categoria}`);
}

export async function updateTarefa(
  _prevState: TarefaFormState,
  formData: FormData,
): Promise<TarefaFormState> {
  const id = String(formData.get("id") ?? "");
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const data = result.data;

  const { error } = await supabase
    .from("tarefas")
    .update({
      titulo: data.titulo,
      descricao: data.descricao || null,
      categoria: data.categoria,
      status: data.status,
      prazo: data.prazo || null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar a tarefa. Tente novamente.", values: raw };

  revalidatePath("/tarefas");
  redirect(`/tarefas?categoria=${data.categoria}`);
}

export async function deleteTarefa(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();
  await supabase.from("tarefas").delete().eq("id", id);
  revalidatePath("/tarefas");
}

/** Troca rápida de status direto na listagem, sem abrir a tela de edição. */
export async function updateTarefaStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("status") ?? "");
  const result = tarefaStatusSchema.safeParse({ status: raw });
  if (!result.success || !id) return;

  const supabase = createClient();
  await supabase.from("tarefas").update({ status: result.data.status }).eq("id", id);
  revalidatePath("/tarefas");
}

/**
 * Autoatendimento: qualquer usuário logado pode ajustar, pra si mesmo, quais das 5 categorias
 * fixas aparecem como aba em `/tarefas` — sem precisar pedir pro master mexer em `/usuarios`. Só
 * grava a própria linha (`auth.uid()`), nunca a de outra pessoa — por isso não tem parâmetro `id`
 * vindo do formulário, é sempre "eu mesmo". A lista de tarefas em si continua compartilhada com
 * todo mundo; isto só decide o que aparece de aba pra essa pessoa (ver
 * `lib/auth/tarefas-categorias.ts`).
 */
export async function atualizarMinhasCategoriasTarefas(formData: FormData): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const categorias = formData.getAll("categorias").map(String).filter(ehTarefaCategoriaValida);

  const admin = createAdminClient();
  await admin.from("perfis").update({ tarefas_categorias_visiveis: categorias }).eq("id", user.id);

  revalidatePath("/tarefas");
}
