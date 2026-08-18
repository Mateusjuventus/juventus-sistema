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
 * Ações da tela pública de vagas (`/vagas/[token]`) — sem login, igual ao autocadastro de Staff.
 * Roda com o cliente admin (service_role) porque quem abre a página não tem sessão.
 *
 * A conferência de "é você mesmo" é o final do CPF. Não é senha e não pretende ser: o link já é
 * secreto (token de 12 caracteres) e circula no grupo fechado do clube; os 4 dígitos servem pra
 * ninguém pegar vaga no lugar de outro por engano ou brincadeira. Nada do cadastro é exibido antes
 * de a pessoa acertar.
 */

export interface VagaPublicaState {
  error?: string;
  sucesso?: "confirmado" | "espera";
  /** Função e horário DELA, devolvidos junto do sucesso pra a tela de confirmação dizer a que horas
   * essa pessoa tem que chegar — o horário muda de uma função pra outra. */
  funcaoNome?: string;
  horario?: string | null;
}

/**
 * Pega a vaga. Toda a decisão (tem vaga? qual função? entra ou vai pra espera?) acontece dentro da
 * função `pegar_vaga_staff` no banco — ver o comentário longo em 0073_vagas_staff_jogo.sql sobre
 * por que conferir o limite aqui no servidor não seria suficiente.
 */
export async function pegarVaga(
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
    .from("staff_operacional")
    .select("id, cpf, ativo")
    .eq("id", staffId)
    .maybeSingle();

  if (!pessoa || !(pessoa as { ativo: boolean }).ativo) {
    return { error: "Cadastro não encontrado. Fale com o Departamento de Futebol." };
  }
  if (!confereFinalCpf((pessoa as { cpf: string | null }).cpf, finalCpf)) {
    // Mensagem propositalmente igual pra nome inexistente e dígito errado — dizer "esse não é o CPF
    // do Fulano" contaria a quem tentou que o Fulano existe e está cadastrado.
    return { error: "Os 4 dígitos não conferem com esse nome. Confira e tente de novo." };
  }

  const { data, error } = await admin.rpc("pegar_vaga_staff", { p_token: token, p_staff_id: staffId });
  if (error) return { error: `Não foi possível registrar agora: ${error.message}` };

  const resultado = data as ResultadoPegarVaga;
  if (resultado === "confirmado" || resultado === "espera") {
    revalidatePath(`/vagas/${token}`);
    const detalhe = await detalheDaVaga(admin, token, staffId);
    return { sucesso: resultado, ...detalhe };
  }
  return { error: MENSAGEM_RESULTADO[resultado] ?? "Não foi possível registrar agora." };
}

/**
 * Busca a função e o horário da vaga que a pessoa acabou de pegar. É uma consulta a mais depois do
 * sucesso, de propósito: a função do banco devolve só o resultado ('confirmado'/'espera'), e é
 * melhor mantê-la assim — ela roda dentro de um lock e não deve carregar trabalho de exibição.
 */
async function detalheDaVaga(
  admin: ReturnType<typeof createAdminClient>,
  token: string,
  staffId: string,
): Promise<{ funcaoNome?: string; horario?: string | null }> {
  const { data: vagas } = await admin
    .from("jogo_vagas_staff")
    .select("id, horario_apresentacao")
    .eq("token", token)
    .maybeSingle();
  if (!vagas) return {};

  const { data: inscricao } = await admin
    .from("jogo_vagas_staff_inscricoes")
    .select("vaga_funcao_id")
    .eq("vagas_id", (vagas as { id: string }).id)
    .eq("staff_id", staffId)
    .maybeSingle();
  if (!inscricao) return {};

  const { data: vagaFuncao } = await admin
    .from("jogo_vagas_staff_funcoes")
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

/** Desistir libera a vaga imediatamente — é o que faz a lista continuar valendo alguma coisa na
 * véspera do jogo. */
export async function desistirVaga(
  token: string,
  _prevState: VagaPublicaState,
  formData: FormData,
): Promise<VagaPublicaState> {
  const staffId = String(formData.get("staffId") ?? "").trim();
  const finalCpf = String(formData.get("finalCpf") ?? "").trim();
  if (!staffId) return { error: "Escolha o seu nome na lista." };

  const admin = createAdminClient();
  const { data: pessoa } = await admin.from("staff_operacional").select("cpf").eq("id", staffId).maybeSingle();
  if (!confereFinalCpf((pessoa as { cpf: string | null } | null)?.cpf, finalCpf)) {
    return { error: "Os 4 dígitos não conferem com esse nome." };
  }

  const { error } = await admin.rpc("desistir_vaga_staff", { p_token: token, p_staff_id: staffId });
  if (error) return { error: `Não foi possível desistir agora: ${error.message}` };

  revalidatePath(`/vagas/${token}`);
  return {};
}
