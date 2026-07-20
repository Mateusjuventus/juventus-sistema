import { type NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildXlsxResponse } from "@/lib/xlsx-export";
import { formatCPF } from "@/lib/validation/cpf";
import { ehCategoriaBaseValida, categoriaBaseLabel } from "@/lib/auth/categorias-base";
import type { AtletaBaseRow, AtletaStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<AtletaStatus, string> = {
  liberado: "Liberado",
  suspenso: "Suspenso",
  departamento_medico: "Departamento Médico",
};

const PE_LABEL: Record<string, string> = {
  destro: "Destro",
  canhoto: "Canhoto",
  ambidestro: "Ambidestro",
};

function formatData(data: string | null): string {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Exporta a lista de Atletas de uma categoria do Futebol de Base pra Excel — espelha
 * `app/atletas/export/route.ts`, filtrado pela categoria da URL. */
export async function GET(request: NextRequest, { params }: { params: { categoria: string } }) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();
  const categoria = params.categoria;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";
  const supabase = createClient();

  let query = supabase
    .from("atletas_base")
    .select("*")
    .eq("categoria", categoria)
    .order("nome_completo", { ascending: true });
  if (q) query = query.ilike("nome_completo", `%${q}%`);
  if (status) query = query.eq("status", status);

  const { data } = await query;
  const atletas = (data ?? []) as AtletaBaseRow[];

  const linhas = atletas.map((a) => ({
    "Nome completo": a.nome_completo,
    RG: a.rg,
    CPF: formatCPF(a.cpf),
    "Data de nascimento": formatData(a.data_nascimento),
    Posição: a.posicao,
    "Número da camisa": a.numero_camisa ?? "",
    "Pé dominante": a.pe_dominante ? PE_LABEL[a.pe_dominante] ?? a.pe_dominante : "",
    Telefone: a.telefone ?? "",
    "Cidade natal": a.cidade_natal ?? "",
    "UF natal": a.uf_natal ?? "",
    "Endereço atual": a.endereco_atual ?? "",
    "Início no clube": formatData(a.data_inicio_clube),
    Empresário: a.empresario_nome ?? "",
    Status: STATUS_LABEL[a.status],
    "Fim do contrato": formatData(a.data_fim_contrato),
  }));

  return buildXlsxResponse(`atletas-base-${categoria}.xlsx`, [
    { nome: categoriaBaseLabel(categoria), linhas },
  ]);
}
