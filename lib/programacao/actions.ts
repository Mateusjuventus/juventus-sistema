"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasProgramacao } from "./permissoes";
import {
  criarAtividadeSchema,
  criarAtividadeDeJogoSchema,
  criarSubatividadeSchema,
} from "@/lib/validation/schemas";
import type { CategoriaBase } from "@/lib/auth/categorias-base";
import { turnoDoHorarioInicio } from "./tipo-atividade";

/**
 * Server Actions da Programação Semanal (ver
 * docs/superpowers/specs/2026-08-30-area-treinador-programacao-design.md). Usadas tanto por
 * `/treinador` quanto por `/base` (Início do Futebol de Base) — toda ação re-verifica a categoria
 * contra
 * `getCategoriasProgramacao()` antes de gravar, mesmo padrão de dupla checagem já usado em
 * `app/treinador/actions.ts` (RLS nas tabelas `programacao_*` é só a mesma policy genérica de
 * qualquer usuário autenticado, igual a todas as tabelas `*_base` — não filtra por categoria).
 *
 * Sem edição/remoção de atividade ou subatividade nesta rodada (não estava no mockup aprovado) —
 * só criar e visualizar.
 */

export interface ProgramacaoFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

async function categoriaLiberada(
  supabase: ReturnType<typeof createClient>,
  categoria: string,
): Promise<boolean> {
  const categorias = await getCategoriasProgramacao(supabase);
  return (categorias as string[]).includes(categoria);
}

/** "+ Nova Atividade" pra qualquer tipo que não seja jogo — ver `criarAtividadeDeJogo` pra
 * 'jogo_oficial'/'jogo_treino'. */
export async function criarAtividade(
  _prevState: ProgramacaoFormState,
  formData: FormData,
): Promise<ProgramacaoFormState> {
  const supabase = createClient();

  const raw = {
    categoria: String(formData.get("categoria") ?? ""),
    data: String(formData.get("data") ?? ""),
    nome: String(formData.get("nome") ?? ""),
    tipo: String(formData.get("tipo") ?? ""),
    horarioInicio: String(formData.get("horarioInicio") ?? ""),
    horarioTermino: String(formData.get("horarioTermino") ?? "") || undefined,
    local: String(formData.get("local") ?? "") || undefined,
  };
  const result = criarAtividadeSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors };
  }
  const data = result.data;

  if (!(await categoriaLiberada(supabase, data.categoria))) {
    return { error: "Você não tem permissão para criar atividades nesta categoria." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("programacao_atividades").insert({
    categoria: data.categoria,
    data: data.data,
    turno: turnoDoHorarioInicio(data.horarioInicio),
    nome: data.nome,
    tipo: data.tipo,
    horario_inicio: data.horarioInicio,
    horario_termino: data.horarioTermino ?? null,
    // Mesmo fallback do mockup aprovado: quando o Local fica em branco, assume o CT do clube.
    local: data.local ?? "CT Juventus",
    created_by: user?.id ?? null,
  });
  if (error) return { error: `Não foi possível criar a atividade: ${error.message}` };

  revalidatePath("/treinador");
  revalidatePath("/base");
  return {};
}

/** "+ Nova Atividade" quando o tipo é Jogo Oficial/Jogo Treino — troca horário/local por um jogo já
 * cadastrado em `jogos_base` daquela categoria; a atividade grava só `jogo_id` (ver spec,
 * "Atividade de jogo não duplica dado"). Nome vem automático do tipo (não faz sentido pedir do
 * usuário um nome pra algo que já é identificado pelo jogo escolhido). */
export async function criarAtividadeDeJogo(
  _prevState: ProgramacaoFormState,
  formData: FormData,
): Promise<ProgramacaoFormState> {
  const supabase = createClient();

  const raw = {
    categoria: String(formData.get("categoria") ?? ""),
    tipo: String(formData.get("tipo") ?? ""),
    jogoId: String(formData.get("jogoId") ?? ""),
  };
  const result = criarAtividadeDeJogoSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors };
  }
  const data = result.data;

  if (!(await categoriaLiberada(supabase, data.categoria))) {
    return { error: "Você não tem permissão para criar atividades nesta categoria." };
  }

  const { data: jogo } = await supabase
    .from("jogos_base")
    .select("categoria, data_jogo, horario")
    .eq("id", data.jogoId)
    .maybeSingle();
  if (!jogo || jogo.categoria !== data.categoria) {
    return { error: "Jogo não encontrado nesta categoria." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nome = data.tipo === "jogo_oficial" ? "Jogo Oficial" : "Jogo Treino";
  const horarioInicio = jogo.horario ?? "00:00";

  const { error } = await supabase.from("programacao_atividades").insert({
    categoria: data.categoria,
    data: jogo.data_jogo,
    turno: turnoDoHorarioInicio(horarioInicio),
    nome,
    tipo: data.tipo,
    horario_inicio: horarioInicio,
    horario_termino: null,
    local: null,
    jogo_id: data.jogoId,
    created_by: user?.id ?? null,
  });
  if (error) return { error: `Não foi possível criar a atividade: ${error.message}` };

  revalidatePath("/treinador");
  revalidatePath("/base");
  return {};
}

/** "+ Nova Subatividade", dentro do detalhe de uma atividade. `config` chega como uma string JSON
 * (o formulário rico do mockup — diagrama, regras, sliders etc. — é serializado no client antes de
 * enviar; ver `components/programacao/nova-subatividade-modal.tsx`, Fase 3). Quando "Criar Novas
 * Regras de SubAtividade" está marcado, grava a mesma subatividade também no catálogo da categoria
 * (cópia independente — ver spec, "Catálogo não é modificado ao ser usado"). */
export async function criarSubatividade(
  _prevState: ProgramacaoFormState,
  formData: FormData,
): Promise<ProgramacaoFormState> {
  const supabase = createClient();

  const atividadeId = String(formData.get("atividadeId") ?? "");
  if (!atividadeId) return { error: "Atividade inválida." };

  const raw = {
    nome: String(formData.get("nome") ?? ""),
    duracaoBlocos: String(formData.get("duracaoBlocos") ?? "") || undefined,
    intervaloMin: String(formData.get("intervaloMin") ?? "") || undefined,
    videoUrl: String(formData.get("videoUrl") ?? ""),
    observacoes: String(formData.get("observacoes") ?? ""),
  };
  const result = criarSubatividadeSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors };
  }
  const data = result.data;

  let config: Record<string, unknown> = {};
  const configRaw = String(formData.get("config") ?? "");
  if (configRaw) {
    try {
      config = JSON.parse(configRaw) as Record<string, unknown>;
    } catch {
      return { error: "Configuração da subatividade inválida." };
    }
  }

  const { data: atividade } = await supabase
    .from("programacao_atividades")
    .select("categoria")
    .eq("id", atividadeId)
    .maybeSingle();
  if (!atividade) return { error: "Atividade não encontrada." };

  const categoria = atividade.categoria as CategoriaBase;
  if (!(await categoriaLiberada(supabase, categoria))) {
    return { error: "Você não tem permissão para editar esta atividade." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("programacao_subatividades").insert({
    atividade_id: atividadeId,
    nome: data.nome,
    duracao_blocos: data.duracaoBlocos ?? null,
    intervalo_min: data.intervaloMin ?? null,
    video_url: data.videoUrl || null,
    observacoes: data.observacoes || null,
    config,
    created_by: user?.id ?? null,
  });
  if (error) return { error: `Não foi possível salvar a subatividade: ${error.message}` };

  const salvarNoCatalogo = formData.get("salvarNoCatalogo") === "on";
  if (salvarNoCatalogo) {
    const { error: catalogoError } = await supabase.from("programacao_catalogo_subatividades").insert({
      categoria,
      nome: data.nome,
      duracao_blocos: data.duracaoBlocos ?? null,
      intervalo_min: data.intervaloMin ?? null,
      video_url: data.videoUrl || null,
      observacoes: data.observacoes || null,
      config,
      created_by: user?.id ?? null,
    });
    // Best-effort: a subatividade já foi salva na atividade, que é o que importa pro plano da
    // semana — não adicionar ao catálogo reutilizável não deveria travar isso.
    if (catalogoError) {
      return { error: "Subatividade salva, mas não foi possível adicioná-la ao catálogo." };
    }
  }

  revalidatePath("/treinador");
  revalidatePath("/base");
  return {};
}
