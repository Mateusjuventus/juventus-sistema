"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadFotoRedimensionada } from "@/lib/supabase/storage";
import { getCategoriasBasePermitidas } from "@/lib/auth/role";
import { jogoBaseSchema } from "@/lib/validation/schemas";

/**
 * Espelha `app/jogos/actions.ts`, mas grava em `jogos_base` (tabela totalmente independente — ver
 * docs/superpowers/specs/2026-07-20-futebol-de-base-design.md) e inclui `categoria`. A lista de
 * Jogos do Futebol de Base é unificada (sem segmento de categoria na URL) — a categoria continua
 * sendo um campo do formulário, editável a qualquer momento, mas não afeta o redirecionamento.
 */
export interface JogoBaseFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

function parseForm(formData: FormData) {
  const raw = {
    categoria: String(formData.get("categoria") ?? ""),
    competicaoId: String(formData.get("competicaoId") ?? ""),
    rodadaFase: String(formData.get("rodadaFase") ?? ""),
    adversarioNome: String(formData.get("adversarioNome") ?? ""),
    dataJogo: String(formData.get("dataJogo") ?? ""),
    horario: String(formData.get("horario") ?? ""),
    localEstadio: String(formData.get("localEstadio") ?? ""),
    endereco: String(formData.get("endereco") ?? ""),
    mandante: formData.get("mandante") === "on",
    golsPro: String(formData.get("golsPro") ?? "") || undefined,
    golsContra: String(formData.get("golsContra") ?? "") || undefined,
  };

  const result = jogoBaseSchema.safeParse(raw);
  return {
    raw: {
      ...raw,
      mandante: raw.mandante ? "on" : "",
      golsPro: raw.golsPro ?? "",
      golsContra: raw.golsContra ?? "",
    },
    result,
  };
}

async function uploadLogoIfPresent(
  supabase: ReturnType<typeof createClient>,
  formData: FormData,
  id: string,
): Promise<{ path?: string | null; error?: string }> {
  const file = formData.get("adversarioLogo");
  if (!(file instanceof File) || file.size === 0) return {};

  // `formato: "png"` preserva a transparência do escudo (ver doc-comment de `uploadFotoRedimensionada`)
  // — sem isso, o fundo transparente do PNG enviado saía preto sólido nos documentos/PDFs.
  const { path, error } = await uploadFotoRedimensionada(supabase, file, "jogos-base", id, "adversario-logo", {
    formato: "png",
  });

  if (error) return { error: "Não foi possível enviar o logo. O restante dos dados não foi salvo." };
  return { path };
}

/**
 * Resolve a competição escolhida no `<select>` de `jogo-form-base.tsx` (ver doc-comment de
 * `jogoBaseSchema`). Confere de novo que ela existe e é da mesma categoria do jogo — defesa em
 * profundidade, igual à checagem de `categoriasPermitidas` acima: evita que alguém com acesso
 * restrito vincule (manipulando o formulário) uma competição de outra categoria.
 */
async function resolverCompeticaoSelecionada(
  supabase: ReturnType<typeof createClient>,
  competicaoId: string,
  categoria: string,
): Promise<{ id: string; nome: string } | null> {
  if (!competicaoId) return null;
  const { data } = await supabase
    .from("competicoes_base")
    .select("id, nome, categoria")
    .eq("id", competicaoId)
    .maybeSingle();
  if (!data || data.categoria !== categoria) return null;
  return { id: data.id as string, nome: data.nome as string };
}

export async function createJogoBase(
  _prevState: JogoBaseFormState,
  formData: FormData,
): Promise<JogoBaseFormState> {
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const id = randomUUID();
  const data = result.data;

  // Defesa em profundidade: o `<select>` já só oferece as categorias permitidas (ver
  // docs/superpowers/specs/2026-09-13-acesso-por-categoria-comissao-tecnica-design.md), mas confere
  // de novo aqui — quem tem acesso restrito não deve conseguir criar um jogo fora do escopo dele
  // mesmo manipulando o formulário direto.
  const categoriasPermitidas = await getCategoriasBasePermitidas(supabase);
  if (!categoriasPermitidas.includes(data.categoria)) {
    return { error: "Você não tem permissão para cadastrar um jogo nessa categoria.", values: raw };
  }

  const selecionada = await resolverCompeticaoSelecionada(supabase, data.competicaoId ?? "", data.categoria);

  const { error: uploadError, path: logoPath } = await uploadLogoIfPresent(supabase, formData, id);
  if (uploadError) return { error: uploadError, values: raw };

  const { error } = await supabase.from("jogos_base").insert({
    id,
    categoria: data.categoria,
    // `jogos_base.competicao` é "text not null" — sem seleção, grava "" (nunca null). Ver
    // doc-comment de `jogoBaseSchema`.
    competicao: selecionada?.nome ?? "",
    rodada_fase: data.rodadaFase || null,
    adversario_nome: data.adversarioNome,
    adversario_logo_path: logoPath ?? null,
    data_jogo: data.dataJogo,
    horario: data.horario || null,
    local_estadio: data.localEstadio || null,
    endereco: data.endereco || null,
    mandante: data.mandante,
    gols_pro: data.golsPro ?? null,
    gols_contra: data.golsContra ?? null,
  });

  if (error) return { error: "Não foi possível salvar o jogo. Tente novamente.", values: raw };

  if (selecionada) {
    await supabase
      .from("competicao_jogos_base")
      .upsert({ jogo_id: id, competicao_id: selecionada.id }, { onConflict: "jogo_id" });
  }

  revalidatePath("/base/jogos");
  redirect("/base/jogos");
}

export async function updateJogoBase(
  _prevState: JogoBaseFormState,
  formData: FormData,
): Promise<JogoBaseFormState> {
  const id = String(formData.get("id") ?? "");
  const { raw, result } = parseForm(formData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors, values: raw };
  }

  const supabase = createClient();
  const data = result.data;

  const categoriasPermitidas = await getCategoriasBasePermitidas(supabase);
  if (!categoriasPermitidas.includes(data.categoria)) {
    return { error: "Você não tem permissão para mover esse jogo pra essa categoria.", values: raw };
  }

  const selecionada = await resolverCompeticaoSelecionada(supabase, data.competicaoId ?? "", data.categoria);
  const { data: linkExistente } = await supabase
    .from("competicao_jogos_base")
    .select("competicao_id")
    .eq("jogo_id", id)
    .maybeSingle();

  const { error: uploadError, path: logoPath } = await uploadLogoIfPresent(supabase, formData, id);
  if (uploadError) return { error: uploadError, values: raw };

  const updatePayload: Record<string, unknown> = {
    categoria: data.categoria,
    rodada_fase: data.rodadaFase || null,
    adversario_nome: data.adversarioNome,
    data_jogo: data.dataJogo,
    horario: data.horario || null,
    local_estadio: data.localEstadio || null,
    endereco: data.endereco || null,
    mandante: data.mandante,
    gols_pro: data.golsPro ?? null,
    gols_contra: data.golsContra ?? null,
  };
  if (logoPath) updatePayload.adversario_logo_path = logoPath;

  // `competicao` (texto livre, legado) só é sobrescrito quando há algo a refletir: uma competição
  // selecionada agora, ou um desvínculo explícito de uma que estava vinculada antes. Um jogo que
  // nunca foi vinculado a um cadastro estruturado (pré-existe a essa feature) mantém o texto livre
  // intocado — nunca apagamos o histórico dele silenciosamente.
  if (selecionada) {
    updatePayload.competicao = selecionada.nome;
  } else if (linkExistente) {
    updatePayload.competicao = "";
  }

  const { error } = await supabase.from("jogos_base").update(updatePayload).eq("id", id);

  if (error) return { error: "Não foi possível salvar o jogo. Tente novamente.", values: raw };

  if (selecionada) {
    const payload: Record<string, unknown> = { jogo_id: id, competicao_id: selecionada.id };
    // Trocou de competição: reseta fase/grupo, já que eram referências à estrutura da competição
    // anterior e não fazem sentido na nova.
    if (linkExistente && linkExistente.competicao_id !== selecionada.id) {
      payload.fase_id = null;
      payload.grupo_id = null;
    }
    await supabase.from("competicao_jogos_base").upsert(payload, { onConflict: "jogo_id" });
  } else if (linkExistente) {
    await supabase.from("competicao_jogos_base").delete().eq("jogo_id", id);
  }

  revalidatePath("/base/jogos");
  revalidatePath(`/base/jogos/${id}`);
  redirect("/base/jogos");
}

export async function deleteJogoBase(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const supabase = createClient();

  await supabase.from("jogos_base").delete().eq("id", id);

  revalidatePath("/base/jogos");
  // Chamado agora de dentro do próprio jogo (`/base/jogos/[id]`) — ver comentário equivalente no
  // Profissional (`app/jogos/actions.ts`).
  redirect("/base/jogos");
}
