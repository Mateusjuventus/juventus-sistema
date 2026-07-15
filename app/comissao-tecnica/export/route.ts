import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildXlsxResponse } from "@/lib/xlsx-export";
import { formatCPF } from "@/lib/validation/cpf";
import type { ComissaoTecnicaRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const QUARTO_LABEL: Record<string, string> = { single: "Single", duplo: "Duplo" };

function formatData(data: string | null): string {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Exporta a lista de Comissão Técnica / Diretoria para Excel, respeitando o filtro de busca da tela. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const supabase = createClient();

  let query = supabase.from("comissao_tecnica").select("*").order("nome_completo", { ascending: true });
  if (q) query = query.ilike("nome_completo", `%${q}%`);

  const { data } = await query;
  const pessoas = (data ?? []) as ComissaoTecnicaRow[];

  const linhas = pessoas.map((p) => ({
    "Nome completo": p.nome_completo,
    RG: p.rg,
    CPF: formatCPF(p.cpf),
    "Data de nascimento": formatData(p.data_nascimento),
    "Função/cargo": p.funcao,
    Telefone: p.telefone ?? "",
    "E-mail": p.email ?? "",
    "Tipo de quarto preferido": p.tipo_quarto_preferido ? QUARTO_LABEL[p.tipo_quarto_preferido] ?? "" : "",
  }));

  return buildXlsxResponse("comissao-tecnica.xlsx", [{ nome: "Comissão Técnica", linhas }]);
}
