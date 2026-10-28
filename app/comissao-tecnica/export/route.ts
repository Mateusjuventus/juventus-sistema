import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildXlsxResponse } from "@/lib/xlsx-export";
import { formatCPF } from "@/lib/validation/cpf";
import { formatTelefone } from "@/lib/validation/telefone";
import { COMISSAO_TECNICA_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import { getCategoriasBasePermitidas, getDepartamentosPermitidos, podeVerCampoSensivel } from "@/lib/auth/role";
import {
  categoriaComissaoTecnicaLabel,
  ehCategoriaComissaoTecnicaValida,
  type CategoriaComissaoTecnica,
} from "@/lib/auth/categorias-base";
import type { ComissaoTecnicaRow } from "@/lib/supabase/types";

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

/** Exporta a lista única de Comissão Técnica/Diretoria pra Excel (Profissional + Base já
 * unificados — ver docs/superpowers/specs/2026-10-28-unificacao-comissao-tecnica-design.md),
 * respeitando os filtros de busca/categoria da tela. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const categoria = searchParams.get("categoria")?.trim() ?? "";
  const supabase = createClient();

  let query = supabase.from("comissao_tecnica").select("*").order("nome_completo", { ascending: true });
  if (q) query = query.ilike("nome_completo", `%${q}%`);
  if (categoria && ehCategoriaComissaoTecnicaValida(categoria)) query = query.contains("categorias", [categoria]);

  const [{ data }, departamentosPermitidos, categoriasBasePermitidas] = await Promise.all([
    query,
    getDepartamentosPermitidos(supabase),
    getCategoriasBasePermitidas(supabase),
  ]);
  // Mesmo filtro de blocos da tela (`app/comissao-tecnica/page.tsx`) — os dois interruptores de
  // módulo continuam valendo mesmo exportando pra Excel, senão o Excel vira uma forma de contornar
  // o que a tela já esconde.
  const categoriasPermitidas: CategoriaComissaoTecnica[] = [
    ...(departamentosPermitidos.includes("futebol_profissional") ? (["profissional"] as const) : []),
    ...categoriasBasePermitidas,
  ];
  const pessoas = ((data ?? []) as ComissaoTecnicaRow[]).filter((p) =>
    p.categorias.some((c) => categoriasPermitidas.includes(c)),
  );
  // Mesmo bloqueio do formulário de edição — ver docs/superpowers/specs/2026-10-02-campos-
  // sensiveis-e-atletas-por-categoria-design.md. Quem tem "Salário" escondido não pode simplesmente
  // baixar o Excel pra contornar a tela.
  const podeVerSalario = await podeVerCampoSensivel(supabase, "salario");

  const linhas = pessoas.map((p) => ({
    "Nome completo": p.nome_completo,
    "Categoria(s)": p.categorias.map(categoriaComissaoTecnicaLabel).join(", "),
    RG: p.rg,
    CPF: formatCPF(p.cpf),
    "Data de nascimento": formatData(p.data_nascimento),
    "Função/cargo": p.funcao,
    Telefone: p.telefone ? formatTelefone(p.telefone) : "",
    "E-mail": p.email ?? "",
    "Tipo de contrato": tipoContratoLabel(p.tipo_contrato),
    ...(podeVerSalario ? { "Salário mensal": formatMoeda(p.valor_salario) } : {}),
    "Quando iniciou": formatData(p.data_inicio),
  }));

  return buildXlsxResponse("comissao-tecnica.xlsx", [{ nome: "Comissão Técnica", linhas }]);
}
