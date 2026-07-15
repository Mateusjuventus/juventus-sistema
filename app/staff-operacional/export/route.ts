import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildXlsxResponse } from "@/lib/xlsx-export";
import { formatCPF } from "@/lib/validation/cpf";
import { STAFF_CHAVE_PIX_TIPOS } from "@/lib/validation/schemas";
import type { StaffOperacionalComFuncaoRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const CHAVE_PIX_TIPO_LABEL = Object.fromEntries(STAFF_CHAVE_PIX_TIPOS.map((t) => [t.value, t.label]));

function formatData(data: string | null): string {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatMoeda(valor: number | null): string {
  if (valor === null) return "";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Exporta a lista de Staff Operacional para Excel (ativos e inativos), respeitando os mesmos
 * filtros de busca/função da tela. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const funcaoId = searchParams.get("funcaoId")?.trim() ?? "";
  const supabase = createClient();

  let query = supabase
    .from("staff_operacional")
    .select("*, funcao:staff_funcoes_catalogo(nome)")
    .order("nome_completo", { ascending: true });
  if (q) query = query.ilike("nome_completo", `%${q}%`);
  if (funcaoId) query = query.eq("funcao_id", funcaoId);

  const { data } = await query;
  const staff = (data ?? []) as StaffOperacionalComFuncaoRow[];

  const linhas = staff.map((s) => ({
    "Nome completo": s.nome_completo,
    RG: s.rg,
    CPF: formatCPF(s.cpf),
    "Data de nascimento": formatData(s.data_nascimento),
    "Função/setor": s.funcao?.nome ?? "",
    Telefone: s.telefone ?? "",
    "E-mail": s.email ?? "",
    CEP: s.cep ?? "",
    "Rua/logradouro": s.logradouro ?? "",
    Número: s.numero ?? "",
    Complemento: s.complemento ?? "",
    Bairro: s.bairro ?? "",
    Cidade: s.cidade ?? "",
    UF: s.uf ?? "",
    "Chave PIX": s.chave_pix ?? "",
    "Tipo de chave PIX": s.chave_pix_tipo ? CHAVE_PIX_TIPO_LABEL[s.chave_pix_tipo] ?? "" : "",
    "Valor padrão de pagamento": formatMoeda(s.valor_padrao_pagamento),
    Status: s.ativo ? "Ativo" : "Inativo",
  }));

  return buildXlsxResponse("staff-operacional.xlsx", [{ nome: "Staff Operacional", linhas }]);
}
