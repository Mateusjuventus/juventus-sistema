"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMaster } from "@/lib/auth/role";
import { TODOS_MODULOS, ehModuloValido } from "@/lib/auth/modulos";
import { TODOS_MODULOS_BASE, ehModuloBaseValido } from "@/lib/auth/modulos-base";
import { TODOS_DEPARTAMENTOS, ehDepartamentoValido } from "@/lib/auth/departamentos";
import { ehTarefaCategoriaValida } from "@/lib/auth/tarefas-categorias";
import { TODAS_ESTOQUE_CATEGORIAS, ehEstoqueCategoriaValida } from "@/lib/auth/estoque-categorias";
import type { PerfilRole } from "@/lib/supabase/types";
import type { PermissaoActionState } from "@/components/permissao-checkboxes-form";

export interface UsuarioFormState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string | undefined>;
}

function parseRole(formData: FormData): PerfilRole {
  return formData.get("role") === "master" ? "master" : "regular";
}

/** Lê os checkboxes de "Módulos liberados" marcados no formulário, validando contra a lista
 * conhecida (`lib/auth/modulos.ts`) — qualquer valor fora dela é ignorado. "Master" sempre grava
 * todos os módulos, já que o papel dele já dá acesso a tudo independente disso (ver
 * `lib/auth/role.ts`) — evita ficar com uma lista "incompleta" salva caso a pessoa vire "regular"
 * depois. */
function parseModulos(formData: FormData, role: PerfilRole): string[] {
  if (role === "master") return TODOS_MODULOS;
  return formData.getAll("modulos").map(String).filter(ehModuloValido);
}

/** Mesma lógica de `parseModulos`, mas pros módulos do Futebol de Base (ver
 * `lib/auth/modulos-base.ts`). "Master" sempre grava todos. */
function parseModulosBase(formData: FormData, role: PerfilRole): string[] {
  if (role === "master") return TODOS_MODULOS_BASE;
  return formData.getAll("modulosBase").map(String).filter(ehModuloBaseValido);
}

/** Mesma lógica de `parseModulos`, mas pros dois departamentos (Futebol Profissional / Futebol de
 * Base — ver `lib/auth/departamentos.ts`). "Master" sempre grava os dois. */
function parseDepartamentos(formData: FormData, role: PerfilRole): string[] {
  if (role === "master") return TODOS_DEPARTAMENTOS;
  return formData.getAll("departamentos").map(String).filter(ehDepartamentoValido);
}

/** Categorias de Tarefas (Logística, Registro, Financeiro, Solicitações, Gerais) marcadas como
 * visíveis pra esse usuário em `/tarefas` — ver `lib/auth/tarefas-categorias.ts`. Diferente de
 * módulo/departamento, isto vale igual pra master e regular (é só preferência de exibição, não
 * controla acesso a nada). */
function parseCategoriasTarefas(formData: FormData): string[] {
  return formData.getAll("tarefasCategorias").map(String).filter(ehTarefaCategoriaValida);
}

/** Ramificações de Estoque (Esportivo/Médico) liberadas pra esse usuário — ver
 * `lib/auth/estoque-categorias.ts`. Diferente de Tarefas, isto É uma permissão de acesso (o
 * middleware bloqueia quem não tiver), então "master" sempre grava as duas, igual módulo/
 * departamento. */
function parseEstoqueCategorias(formData: FormData, role: PerfilRole): string[] {
  if (role === "master") return TODAS_ESTOQUE_CATEGORIAS;
  return formData.getAll("estoqueCategorias").map(String).filter(ehEstoqueCategoriaValida);
}

/**
 * Cria o login de um novo usuário (e-mail + senha provisória, sem depender de envio de e-mail) e
 * já grava o papel dele em `perfis`. Só pode ser chamada por quem já é master — checa isso antes
 * de qualquer coisa. O e-mail/senha precisam ser repassados pra pessoa por fora do sistema (ex.:
 * WhatsApp); ela consegue trocar a senha depois, uma vez logada.
 */
export async function criarUsuario(
  _prevState: UsuarioFormState,
  formData: FormData,
): Promise<UsuarioFormState> {
  const supabase = createClient();
  if (!(await isMaster(supabase))) {
    return { error: "Você não tem permissão para fazer isso." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const role = parseRole(formData);
  const modulos = parseModulos(formData, role);
  const modulosBase = parseModulosBase(formData, role);
  const departamentos = parseDepartamentos(formData, role);
  const tarefasCategorias = parseCategoriasTarefas(formData);
  const estoqueCategorias = parseEstoqueCategorias(formData, role);
  const raw = { email, role };

  const fieldErrors: Record<string, string> = {};
  if (!email) fieldErrors.email = "E-mail é obrigatório";
  if (senha.length < 6) fieldErrors.senha = "A senha provisória precisa ter pelo menos 6 caracteres";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values: raw };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (error || !data.user) {
    const jaExiste = error?.message?.toLowerCase().includes("already") ?? false;
    return {
      error: jaExiste ? "Já existe um usuário cadastrado com esse e-mail." : "Não foi possível criar o usuário. Tente novamente.",
      values: raw,
    };
  }

  const { error: perfilError } = await admin.from("perfis").insert({
    id: data.user.id,
    email,
    role,
    modulos_permitidos: modulos,
    modulos_base_permitidos: modulosBase,
    departamentos_permitidos: departamentos,
    tarefas_categorias_visiveis: tarefasCategorias,
    estoque_categorias_permitidas: estoqueCategorias,
  });
  if (perfilError) {
    return {
      error: "O login foi criado, mas houve um problema ao salvar o papel dele. Tente novamente ou avise o suporte.",
      values: raw,
    };
  }

  revalidatePath("/usuarios");
  return { success: `Usuário ${email} criado com sucesso.`, values: {} };
}

/** Troca o papel (master/regular) de um usuário já existente. Só master pode chamar. */
export async function atualizarPapel(formData: FormData): Promise<void> {
  const supabase = createClient();
  if (!(await isMaster(supabase))) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const role = parseRole(formData);

  const admin = createAdminClient();
  await admin.from("perfis").update({ role }).eq("id", id);

  revalidatePath("/usuarios");
}

/** Salva os módulos liberados (checkboxes) de um usuário "regular" já existente. Só master pode
 * chamar. Não faz sentido chamar isso pra um usuário "master" (ele já tem tudo liberado) — a tela
 * nem mostra os checkboxes nesse caso, mas a action confere de novo o papel atual no banco antes
 * de gravar, por segurança. Retorna sucesso/erro (em vez de `void`) pra `useFormState` mostrar um
 * feedback visível depois do clique em "Salvar". */
export async function atualizarModulos(
  _prevState: PermissaoActionState,
  formData: FormData,
): Promise<PermissaoActionState> {
  const supabase = createClient();
  if (!(await isMaster(supabase))) return { error: "Você não tem permissão para fazer isso." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Usuário inválido." };

  const admin = createAdminClient();
  const { data: perfilAtual } = await admin.from("perfis").select("role").eq("id", id).maybeSingle();
  const role = ((perfilAtual as { role?: PerfilRole } | null)?.role ?? "regular") as PerfilRole;
  const modulos = parseModulos(formData, role);

  const { error } = await admin.from("perfis").update({ modulos_permitidos: modulos }).eq("id", id);
  if (error) return { error: `Não foi possível salvar os módulos. Tente novamente. (${error.message})` };

  revalidatePath("/usuarios");
  return { success: "Módulos salvos." };
}

/** Salva os módulos liberados do Futebol de Base (checkboxes) de um usuário "regular" já
 * existente — espelha `atualizarModulos`. Só master pode chamar. */
export async function atualizarModulosBase(
  _prevState: PermissaoActionState,
  formData: FormData,
): Promise<PermissaoActionState> {
  const supabase = createClient();
  if (!(await isMaster(supabase))) return { error: "Você não tem permissão para fazer isso." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Usuário inválido." };

  const admin = createAdminClient();
  const { data: perfilAtual } = await admin.from("perfis").select("role").eq("id", id).maybeSingle();
  const role = ((perfilAtual as { role?: PerfilRole } | null)?.role ?? "regular") as PerfilRole;
  const modulosBase = parseModulosBase(formData, role);

  const { error } = await admin.from("perfis").update({ modulos_base_permitidos: modulosBase }).eq("id", id);
  if (error) return { error: `Não foi possível salvar os módulos. Tente novamente. (${error.message})` };

  revalidatePath("/usuarios");
  return { success: "Módulos salvos." };
}

/** Salva os departamentos liberados (Futebol Profissional / Futebol de Base) de um usuário
 * "regular" já existente. Mesma regra de `atualizarModulos`: só master pode chamar, e não faz
 * sentido pra quem é master (já tem os dois). */
export async function atualizarDepartamentos(
  _prevState: PermissaoActionState,
  formData: FormData,
): Promise<PermissaoActionState> {
  const supabase = createClient();
  if (!(await isMaster(supabase))) return { error: "Você não tem permissão para fazer isso." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Usuário inválido." };

  const admin = createAdminClient();
  const { data: perfilAtual } = await admin.from("perfis").select("role").eq("id", id).maybeSingle();
  const role = ((perfilAtual as { role?: PerfilRole } | null)?.role ?? "regular") as PerfilRole;
  const departamentos = parseDepartamentos(formData, role);

  const { error } = await admin
    .from("perfis")
    .update({ departamentos_permitidos: departamentos })
    .eq("id", id);
  if (error) return { error: `Não foi possível salvar os departamentos. Tente novamente. (${error.message})` };

  revalidatePath("/usuarios");
  return { success: "Departamentos salvos." };
}

/** Salva quais categorias de Tarefas aparecem pra esse usuário em `/tarefas`. Só master pode
 * chamar (é quem administra os outros usuários pela tela de Usuários), mas vale igual pra
 * qualquer papel — não é uma permissão de acesso, só o que aparece como aba pra essa pessoa. */
export async function atualizarCategoriasTarefas(
  _prevState: PermissaoActionState,
  formData: FormData,
): Promise<PermissaoActionState> {
  const supabase = createClient();
  if (!(await isMaster(supabase))) return { error: "Você não tem permissão para fazer isso." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Usuário inválido." };
  const tarefasCategorias = parseCategoriasTarefas(formData);

  const admin = createAdminClient();
  const { error } = await admin
    .from("perfis")
    .update({ tarefas_categorias_visiveis: tarefasCategorias })
    .eq("id", id);
  if (error) return { error: `Não foi possível salvar as categorias. Tente novamente. (${error.message})` };

  revalidatePath("/usuarios");
  return { success: "Categorias salvas." };
}

/** Salva quais ramificações de Estoque (Esportivo/Médico) um usuário "regular" já existente pode
 * acessar. Mesma regra de `atualizarModulos`/`atualizarDepartamentos`: só master pode chamar, e
 * não faz sentido pra quem é master (já tem as duas). */
export async function atualizarEstoqueCategorias(
  _prevState: PermissaoActionState,
  formData: FormData,
): Promise<PermissaoActionState> {
  const supabase = createClient();
  if (!(await isMaster(supabase))) return { error: "Você não tem permissão para fazer isso." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Usuário inválido." };

  const admin = createAdminClient();
  const { data: perfilAtual } = await admin.from("perfis").select("role").eq("id", id).maybeSingle();
  const role = ((perfilAtual as { role?: PerfilRole } | null)?.role ?? "regular") as PerfilRole;
  const estoqueCategorias = parseEstoqueCategorias(formData, role);

  const { error } = await admin
    .from("perfis")
    .update({ estoque_categorias_permitidas: estoqueCategorias })
    .eq("id", id);
  if (error)
    return { error: `Não foi possível salvar as ramificações de estoque. Tente novamente. (${error.message})` };

  revalidatePath("/usuarios");
  return { success: "Ramificações de estoque salvas." };
}

/**
 * Redefine a senha de um usuário existente — pra quando ele perde/esquece e não tem como recuperar
 * sozinho (este sistema não usa recuperação por e-mail). Só master pode chamar. O master define uma
 * senha provisória nova aqui e repassa pra pessoa por fora do sistema (WhatsApp etc.), do mesmo
 * jeito que na criação do usuário — ela consegue trocar de novo depois de entrar.
 */
export async function redefinirSenha(
  _prevState: PermissaoActionState,
  formData: FormData,
): Promise<PermissaoActionState> {
  const supabase = createClient();
  if (!(await isMaster(supabase))) return { error: "Você não tem permissão para fazer isso." };

  const id = String(formData.get("id") ?? "");
  const novaSenha = String(formData.get("novaSenha") ?? "");
  if (!id) return { error: "Usuário inválido." };
  if (novaSenha.length < 6) return { error: "A senha precisa ter pelo menos 6 caracteres." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password: novaSenha });
  if (error) return { error: `Não foi possível redefinir a senha. Tente novamente. (${error.message})` };

  return { success: "Senha redefinida. Já pode passar a nova senha pra pessoa." };
}
