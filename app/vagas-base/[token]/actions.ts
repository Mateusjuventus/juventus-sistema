"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  confereFinalCpf,
  horarioDaFuncao,
  MENSAGEM_RESULTADO,
  type ResultadoPegarVaga,
} from "@/lib/futebol/vagas-staff";

/**
 * Espelha `app/vagas/[token]/actions.ts` para o Futebol de Base — tabelas `jogo_vagas_staff_base*`
 * e RPCs `pegar_vaga_staff_base` / `desistir_vaga_staff_base` (ver 0075_vagas_staff_base.sql).
 */

export type { VagaPublicaState } from "@/components/vaga-publica-form";
import type { VagaPublicaState } from "@/components/vaga-publica-form";

/**
 * Pega a vaga. Toda a decisão (tem vaga? qual função? entra ou vai pra espera?) acontece dentro da
 * função `pegar_vaga_staff_base` no banco.
 */
export async function pegarVagaBase(
  token: string,
  _prevState: VagaPublicaState,
  formData: FormData,
): Promise<VagaPublicaState> {
  const staffId = String(formData.get("staffId") ?? "").trim();
  const finalCpf = String(formData.get("finalCpf") ?? "").trim();

  if (!staffId) return { error: "Escolha o seu nome na lista." };
  if (finalCpf.replace(/\D/g, "").length !== 4) return { error: "Digite os 4 últimos dígitos do seu CPF." };

  const admin = createAdminClient();

  const { data: pessoa } = await admin
    .from("staff_operacional_base")
    .select("id, cpf, ativo")
    .eq("id", staffId)
    .maybeSingle();

  if (!pessoa || !(pessoa as { ativo: boolean }).ativo) {
    return { error: "Cadastro não encontrado. Fale com o Departamento de Futebol de Base." };
  }
  if (!confereFinalCpf((pessoa as { cpf: string | null }).cpf, finalCpf)) {
    // Mensagem propositalmente igual pra nome inexistente e dígito errado — dizer "esse não é o CPF
    // do Fulano" contaria a quem tentou que o Fulano existe e está cadastrado.
    return { error: "Os 4 dígitos não conferem com esse nome. Confira e tente de novo." };
  }

  const { data, error } = await admin.rpc("pegar_vaga_staff_base", { p_token: token, p_staff_id: staffId });
  if (error) return { error: `Não foi possível registrar agora: ${error.message}` };

  const resultado = data as ResultadoPegarVaga;
  if (resultado === "confirmado" || resultado === "espera") {
    revalidatePath(`/vagas-base/${token}`);
    const detalhe = await detalheDaVaga(admin, token, staffId);
    return { sucesso: resultado, ...detalhe };
  }
  return { error: MENSAGEM_RESULTADO[resultado] ?? "Não foi possível registrar agora." };
}

/**
 * Busca a função e o horário da vaga que a pessoa acabou de pegar. Consulta a mais depois do
 * sucesso, de propósito: ver o comentário equivalente em `app/vagas/[token]/actions.ts`.
 */
async function detalheDaVaga(
  admin: ReturnType<typeof createAdminClient>,
  token: string,
  staffId: string,
): Promise<{ funcaoNome?: string; horario?: string | null }> {
  const { data: vagas } = await admin
    .from("jogo_vagas_staff_base")
    .select("id, horario_apresentacao")
    .eq("token", token)
    .maybeSingle();
  if (!vagas) return {};

  const { data: inscricao } = await admin
    .from("jogo_vagas_staff_base_inscricoes")
    .select("vaga_funcao_id")
    .eq("vagas_id", (vagas as { id: string }).id)
    .eq("staff_id", staffId)
    .maybeSingle();
  if (!inscricao) return {};

  const { data: vagaFuncao } = await admin
    .from("jogo_vagas_staff_base_funcoes")
    .select("funcao_id, horario_apresentacao")
    .eq("id", (inscricao as { vaga_funcao_id: string }).vaga_funcao_id)
    .maybeSingle();
  if (!vagaFuncao) return {};

  const { data: funcao } = await admin
    .from("staff_funcoes_catalogo")
    .select("nome")
    .eq("id", (vagaFuncao as { funcao_id: string }).funcao_id)
    .maybeSingle();

  return {
    funcaoNome: (funcao as { nome: string } | null)?.nome,
    horario: horarioDaFuncao(
      (vagaFuncao as { horario_apresentacao: string | null }).horario_apresentacao,
      (vagas as { horario_apresentacao: string | null }).horario_apresentacao,
    ),
  };
}

/** Desistir libera a vaga imediatamente. */
export async function desistirVagaBase(
  token: string,
  _prevState: VagaPublicaState,
  formData: FormData,
): Promise<VagaPublicaState> {
  const staffId = String(formData.get("staffId") ?? "").trim();
  const finalCpf = String(formData.get("finalCpf") ?? "").trim();
  if (!staffId) return { error: "Escolha o seu nome na lista." };

  const admin = createAdminClient();
  const { data: pessoa } = await admin.from("staff_operacional_base").select("cpf").eq("id", staffId).maybeSingle();
  if (!confereFinalCpf((pessoa as { cpf: string | null } | null)?.cpf, finalCpf)) {
    return { error: "Os 4 dígitos não conferem com esse nome." };
  }

  const { error } = await admin.rpc("desistir_vaga_staff_base", { p_token: token, p_staff_id: staffId });
  if (error) return { error: `Não foi possível desistir agora: ${error.message}` };

  revalidatePath(`/vagas-base/${token}`);
  return {};
}
