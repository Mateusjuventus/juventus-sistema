"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { eventoCalendarioSchema } from "@/lib/validation/schemas";

export interface EventoCalendarioFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

/**
 * Cria um evento manual do widget "Calendário" (Home do Futebol Profissional — ver
 * docs/superpowers/specs/2026-08-07-redesign-visual-painel-financeiro-design.md). Sem
 * `redirect()` de propósito — o formulário é inline dentro do próprio widget (não uma página à
 * parte), então só devolve `success` pro componente cliente (`calendario-form.tsx`) fechar/limpar
 * o form sozinho, igual o padrão já usado em `app/jogos/[id]/ingressos/carga-inline-form.tsx`.
 */
export async function criarEventoCalendario(
  _prevState: EventoCalendarioFormState,
  formData: FormData,
): Promise<EventoCalendarioFormState> {
  const raw = {
    categoria: String(formData.get("categoria") ?? ""),
    titulo: String(formData.get("titulo") ?? ""),
    data: String(formData.get("data") ?? ""),
    horario: String(formData.get("horario") ?? ""),
    observacao: String(formData.get("observacao") ?? ""),
  };

  const result = eventoCalendarioSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const data = result.data;
  const { error } = await supabase.from("eventos_calendario").insert({
    categoria: data.categoria,
    titulo: data.titulo,
    data: data.data,
    horario: data.horario || null,
    observacao: data.observacao || null,
    created_by: user?.id ?? null,
  });

  if (error) return { error: "Não foi possível salvar o evento. Tente novamente." };

  revalidatePath("/profissional");
  return { success: true };
}

/** Exclui um evento manual — usado pelo botão "Remover" na lista detalhada abaixo do calendário.
 * Só apaga `eventos_calendario` (nunca `jogos`: jogos automáticos não têm botão de excluir aqui,
 * são gerenciados em `/jogos`). */
export async function excluirEventoCalendario(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("eventos_calendario").delete().eq("id", id);
  revalidatePath("/profissional");
}
