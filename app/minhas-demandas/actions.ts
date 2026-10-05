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
 * `categoria` (não se aplica aqui), `responsavel_id` normalmente é sempre `auth.uid()` (ninguém
 * cria demanda de outra pessoa por aqui, com UMA exceção — ver `responsavelId` abaixo), e não
 * existe uma action de editar título/descrição depois de criada — só trocar status ou excluir (ver
 * docs/superpowers/specs/2026-10-05-assistencia-social-e-demandas-design.md, Parte 2: o widget
 * precisa ser rápido de preencher, não um formulário completo de edição). `criarDemanda` não
 * redireciona (ao contrário de `createTarefa`) porque é usada tanto na tela cheia quanto no
 * mini-form embutido no painel flutuante — os dois ficam na mesma página depois de criar.
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

  // Exceção pedida pelo Mateus em 05/10: master pode lançar uma demanda já atribuída a outra
  // pessoa, direto do painel flutuante (ver `DemandasFlutuantePainel`, prop `pessoas`). Nunca
  // confia no que vem do form sozinho — revalida aqui que quem está logado é master de verdade E
  // que a pessoa-alvo está marcada "Acompanhar no painel de Demandas" (mesma trava de quem entra
  // no `<select>`, checada de novo no servidor).
  const responsavelIdForm = String(formData.get("responsavelId") ?? "").trim();
  let responsavelId = user.id;
  if (responsavelIdForm && responsavelIdForm !== user.id) {
    const [{ data: perfilAtual }, { data: alvo }] = await Promise.all([
      supabase.from("perfis").select("role").eq("id", user.id).maybeSingle(),
      supabase.from("perfis").select("id").eq("id", responsavelIdForm).eq("demandas_acompanhado", true).maybeSingle(),
    ]);
    if (perfilAtual?.role === "master" && alvo) responsavelId = responsavelIdForm;
  }

  const data = result.data;
  const { error } = await supabase.from("demandas").insert({
    titulo: data.titulo,
    descricao: data.descricao || null,
    prazo: data.prazo || null,
    responsavel_id: responsavelId,
  });
  if (error) return { error: "Não foi possível salvar a demanda. Tente novamente." };

  revalidatePath("/minhas-demandas");
  revalidatePath("/profissional");
  revalidatePath("/base");
  revalidatePath("/demandas");
  return { success: "Demanda criada." };
}

/** Dono da demanda sempre pode alterá-la; master também pode (mesma exceção de `criarDemanda`,
 * reaproveitada aqui pro master interagir com as demandas de qualquer pessoa acompanhada direto do
 * painel — ver `alternarConclusaoDemanda`). */
async function podeAlterarDemanda(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  responsavelId: string,
): Promise<boolean> {
  if (responsavelId === userId) return true;
  const { data: perfilAtual } = await supabase.from("perfis").select("role").eq("id", userId).maybeSingle();
  return perfilAtual?.role === "master";
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

/** Troca rápida de status (widget da tela inicial, painel flutuante e tela cheia) — mesmo padrão de
 * `updateTarefaStatus`. Autorização via `podeAlterarDemanda` (dono ou master) desde 05/10, pra
 * também valer quando o master usa esse mesmo controle numa demanda de outra pessoa. */
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

  const { data: demanda } = await supabase.from("demandas").select("responsavel_id").eq("id", id).maybeSingle();
  if (!demanda || !(await podeAlterarDemanda(supabase, user.id, demanda.responsavel_id))) return;

  await supabase.from("demandas").update({ status: result.data.status }).eq("id", id);
  revalidatePath("/minhas-demandas");
  revalidatePath("/profissional");
  revalidatePath("/base");
  revalidatePath("/demandas");
}

/**
 * Alterna concluído/pendente com um clique — a "bolinha" de check usada pelo master em
 * `PessoaDemandasModal` (tela intermediária aberta ao clicar numa pessoa em `/demandas`), pedido do
 * Mateus em 05/10: "coloca tipo umas bolinhas de check-box pra clicar em cima". Chamada direto pelo
 * componente client (sem passar por um `<form>`), por isso recebe os valores já prontos em vez de
 * `FormData` como as outras actions deste arquivo. Mesma trava de `updateDemandaStatus` — dono da
 * demanda ou master.
 */
export async function alternarConclusaoDemanda(id: string, concluida: boolean): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: demanda } = await supabase.from("demandas").select("responsavel_id").eq("id", id).maybeSingle();
  if (!demanda || !(await podeAlterarDemanda(supabase, user.id, demanda.responsavel_id))) return;

  await supabase
    .from("demandas")
    .update({ status: concluida ? "concluido" : "pendente" })
    .eq("id", id);
  revalidatePath("/minhas-demandas");
  revalidatePath("/profissional");
  revalidatePath("/base");
  revalidatePath("/demandas");
}
