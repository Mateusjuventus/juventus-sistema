import { type NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildXlsxResponse } from "@/lib/xlsx-export";
import { formatCPF } from "@/lib/validation/cpf";
import { ehCategoriaBaseValida, categoriaBaseLabel } from "@/lib/auth/categorias-base";
import type { ComissaoTecnicaBaseRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const QUARTO_LABEL: Record<string, string> = { single: "Single", duplo: "Duplo" };

function formatData(data: string | null): string {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Exporta a lista de Comissão Técnica/Diretoria de uma categoria do Futebol de Base pra Excel —
 * espelha `app/comissao-tecnica/export/route.ts`, filtrado pela categoria da URL. */
export async function GET(request: NextRequest, { params }: { params: { categoria: string } }) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();
  const categoria = params.categoria;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const supabase = createClient();

  let query = supabase
    .from("comissao_tecnica_base")
    .select("*")
    .eq("categoria", categoria)
    .order("nome_completo", { ascending: true });
  if (q) query = query.ilike("nome_completo", `%${q}%`);

  const { data } = await query;
  const pessoas = (data ?? []) as ComissaoTecnicaBaseRow[];

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

  return buildXlsxResponse(`comissao-tecnica-base-${categoria}.xlsx`, [
    { nome: categoriaBaseLabel(categoria), linhas },
  ]);
}
