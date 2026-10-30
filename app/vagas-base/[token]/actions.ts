"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  confereFinalCpf,
  horarioDaFuncao,
  MENSAGEM_RESULTADO,
  type ResultadoPegarVaga,
} from "@/lib/futebol/vagas-staff";
import { desmarcarReciboAutomatico, marcarReciboAutomatico } from "@/lib/futebol/recibo-auto-sync";

const TABELAS_RECIBO_BASE = { staff: "staff_operacional", recibos: "recibos_jogo" };

async function jogoIdDoToken(
  admin: ReturnType<typeof createAdminClient>,
  token: string,
): Promise<string | null> {
  const { data } = await admin.from("jogo_vagas_staff").select("jogo_id").eq("token", token).maybeSingle();
  return (data as { jogo_id: string } | null)?.jogo_id ?? null;
}

/**
 * Espelha `app/vagas/[token]/actions.ts` para o link público da Base — desde a unificação de
 * Jogos/Convocação (30/10/2026, ver 0157_unificacao_jogos.sql) usa as MESMAS tabelas
 * (`jogo_vagas_staff*`, `staff_operacional`) e as MESMAS RPCs (`pegar_vaga_staff`/
 * `desistir_vaga_staff`) do Profissional — `pegar_vaga_staff_base`/`desistir_vaga_staff_base`
 * foram removidas pela migration. O link `/vagas-base/<token>` continua existindo (token
 * diferente por jogo), só a tabela/RPC por trás é a unificada.
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
    .from("staff_operacional")
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

  const { data, error } = await admin.rpc("pegar_vaga_staff", { p_token: token, p_staff_id: staffId });
  if (error) return { error: `Não foi possível registrar agora: ${error.message}` };

  const resultado = data as ResultadoPegarVaga;
  if (resultado === "confirmado" || resultado === "espera") {
    // Só quem fica de fato "confirmado" entra automaticamente no recibo — quem cai na espera ainda
    // não tem vaga de verdade (ver docs/superpowers/specs/2026-09-12-recibo-automatico-vagas-design.md).
    if (resultado === "confirmado") {
      const jogoId = await jogoIdDoToken(admin, token);
      if (jogoId) {
        await marcarReciboAutomatico({ cliente: admin, tabelas: TABELAS_RECIBO_BASE, jogoId, staffId });
      }
    }
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
  const { data: pessoa } = await admin.from("staff_operacional").select("cpf").eq("id", staffId).maybeSingle();
  if (!confereFinalCpf((pessoa as { cpf: string | null } | null)?.cpf, finalCpf)) {
    return { error: "Os 4 dígitos não conferem com esse nome." };
  }

  const { error } = await admin.rpc("desistir_vaga_staff", { p_token: token, p_staff_id: staffId });
  if (error) return { error: `Não foi possível desistir agora: ${error.message}` };

  const jogoId = await jogoIdDoToken(admin, token);
  if (jogoId) {
    await desmarcarReciboAutomatico({ cliente: admin, tabelaRecibos: TABELAS_RECIBO_BASE.recibos, jogoId, staffId });
  }

  revalidatePath(`/vagas-base/${token}`);
  return {};
}
