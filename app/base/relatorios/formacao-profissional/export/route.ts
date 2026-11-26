import { createClient } from "@/lib/supabase/server";
import { isMaster } from "@/lib/auth/role";
import { buildXlsxResponse } from "@/lib/xlsx-export";
import { formatCPF } from "@/lib/validation/cpf";
import { ATLETA_BASE_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import {
  agruparPorBloco,
  calcularListaFinal,
  evolucoesDoContrato,
  type AtletaParaRelacao,
  type ExcecaoRelacao,
  type LinhaRelacao,
} from "@/lib/futebol/relacao-formacao-profissional";
import type {
  AtletaContratoEvolucaoSalarialRow,
  AtletaContratoRow,
  AtletaRelacaoFormacaoProfissionalExcecaoRow,
  AtletaRow,
  RubricaContrato,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

function formatData(data: string | null): string {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function tipoContratoLabel(valor: string): string {
  return ATLETA_BASE_TIPO_CONTRATO_OPTIONS.find((o) => o.value === valor)?.label ?? valor;
}

const RUBRICA_LABEL: Record<RubricaContrato, string> = {
  salario_ctps: "Salário CTPS",
  direito_imagem: "Direito de Imagem",
  bonificacao: "Bonificação",
  auxilio_moradia: "Auxílio Moradia",
  outros: "Outros",
};

function textoEvolucoes(evolucoes: AtletaContratoEvolucaoSalarialRow[]): string {
  if (evolucoes.length === 0) return "";
  return evolucoes.map((e) => `${formatData(e.data_vigencia)}: ${RUBRICA_LABEL[e.rubrica]} → ${formatMoeda(e.novo_valor)}`).join("; ");
}

function linhaPlanilha(l: LinhaRelacao) {
  return {
    Nome: l.atleta.nomeCompleto,
    CPF: l.atleta.cpf ? formatCPF(l.atleta.cpf) : "",
    "Data de nascimento": formatData(l.atleta.dataNascimento),
    "Tipo de contrato":
      l.contrato.tipo_contrato === "emprestimo" && l.contrato.clube_origem
        ? `${tipoContratoLabel(l.contrato.tipo_contrato)} (${l.contrato.clube_origem})`
        : tipoContratoLabel(l.contrato.tipo_contrato),
    "Vigência: Início": formatData(l.contrato.vigencia_inicio),
    "Vigência: Término": formatData(l.contrato.vigencia_fim),
    "Salário CTPS": formatMoeda(l.contrato.salario_ctps),
    "Direito de Imagem": formatMoeda(l.contrato.direito_imagem),
    Bonificação: formatMoeda(l.contrato.bonificacao),
    "Auxílio Moradia": formatMoeda(l.contrato.auxilio_moradia),
    Outros: formatMoeda(l.contrato.outros),
    "Valor Total": formatMoeda(l.valorTotal),
  };
}

/** Exporta a Relação de Atletas (Formação e Profissional) pra Excel — ver docs/superpowers/specs/
 * 2026-11-26-relacao-formacao-profissional-design.md. Mesmas colunas do PDF (`lib/pdf/relacao-
 * formacao-profissional-document.tsx`), mais "Evolução salarial" só na aba Profissional. Só master,
 * mesma trava da tela (403 aqui, já que é uma rota de arquivo, sem pra onde redirecionar). */
export async function GET() {
  const supabase = createClient();
  if (!(await isMaster(supabase))) {
    return new Response(JSON.stringify({ error: "Não autorizado." }), { status: 403 });
  }

  const [{ data: atletasData }, { data: contratosData }, { data: excecoesData }, { data: evolucoesData }] = await Promise.all([
    supabase.from("atletas").select("id, nome_completo, cpf, data_nascimento, status, ativo, categoria"),
    supabase.from("atleta_contratos").select("*").eq("vigente", true),
    supabase.from("atleta_relacao_formacao_profissional_excecoes").select("*"),
    supabase.from("atleta_contrato_evolucao_salarial").select("*"),
  ]);

  type AtletaCampos = Pick<AtletaRow, "id" | "nome_completo" | "cpf" | "data_nascimento" | "status" | "ativo" | "categoria">;
  const atletas = (atletasData ?? []) as AtletaCampos[];
  const contratos = (contratosData ?? []) as AtletaContratoRow[];
  const excecoes = (excecoesData ?? []) as AtletaRelacaoFormacaoProfissionalExcecaoRow[];
  const evolucoes = (evolucoesData ?? []) as AtletaContratoEvolucaoSalarialRow[];

  const contratoPorAtleta = new Map(contratos.map((c) => [c.atleta_id, c]));
  const todosParaRelacao: AtletaParaRelacao[] = atletas.map((a) => ({
    id: a.id,
    nomeCompleto: a.nome_completo,
    cpf: a.cpf,
    dataNascimento: a.data_nascimento,
    status: a.status,
    ativo: a.ativo,
    categoria: a.categoria,
    contratoVigente: contratoPorAtleta.get(a.id) ?? null,
  }));

  const excecoesParaLib: ExcecaoRelacao[] = excecoes.map((e) => ({ atletaId: e.atleta_id, tipo: e.tipo }));
  const listaFinal = calcularListaFinal(todosParaRelacao, excecoesParaLib);
  const { formacao, profissional } = agruparPorBloco(listaFinal);

  const linhasFormacao = formacao.map(linhaPlanilha);
  const linhasProfissional = profissional.map((l) => ({
    ...linhaPlanilha(l),
    "Evolução salarial": textoEvolucoes(evolucoesDoContrato(l.contrato.id, evolucoes)),
  }));

  return buildXlsxResponse("relacao-formacao-profissional.xlsx", [
    { nome: "Formação", linhas: linhasFormacao },
    { nome: "Profissional", linhas: linhasProfissional },
  ]);
}
