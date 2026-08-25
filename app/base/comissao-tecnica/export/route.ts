import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildXlsxResponse } from "@/lib/xlsx-export";
import { formatCPF } from "@/lib/validation/cpf";
import { COMISSAO_TECNICA_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import { categoriaBaseLabel, ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import type { ComissaoTecnicaBaseRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

function formatData(data: string | null): string {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatMoeda(valor: number | null): string {
  if (valor === null) return "";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function tipoContratoLabel(valor: string | null): string {
  if (!valor) return "";
  return COMISSAO_TECNICA_TIPO_CONTRATO_OPTIONS.find((o) => o.value === valor)?.label ?? valor;
}

/** Exporta a lista de Comissão Técnica/Diretoria da Base pra Excel — espelha
 * `app/comissao-tecnica/export/route.ts`, sem segmento de categoria na URL (a lista agora é única,
 * ver docs/superpowers/specs/2026-08-19-comissao-tecnica-multi-categoria-design.md). */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const categoria = searchParams.get("categoria")?.trim() ?? "";
  const supabase = createClient();

  let query = supabase.from("comissao_tecnica_base").select("*").order("nome_completo", { ascending: true });
  if (q) query = query.ilike("nome_completo", `%${q}%`);
  if (categoria && ehCategoriaBaseValida(categoria)) query = query.contains("categorias", [categoria]);

  const { data } = await query;
  const pessoas = (data ?? []) as ComissaoTecnicaBaseRow[];

  const linhas = pessoas.map((p) => ({
    "Nome completo": p.nome_completo,
    "Categoria(s)": p.categorias.map(categoriaBaseLabel).join(", "),
    RG: p.rg,
    CPF: formatCPF(p.cpf),
    "Data de nascimento": formatData(p.data_nascimento),
    "Função/cargo": p.funcao,
    Telefone: p.telefone ?? "",
    "E-mail": p.email ?? "",
    "Tipo de contrato": tipoContratoLabel(p.tipo_contrato),
    "Salário mensal": formatMoeda(p.valor_salario),
    "Quando iniciou": formatData(p.data_inicio),
  }));

  return buildXlsxResponse("comissao-tecnica-base.xlsx", [{ nome: "Comissão Técnica", linhas }]);
}
