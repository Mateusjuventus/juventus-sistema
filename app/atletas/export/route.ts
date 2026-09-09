import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildXlsxResponse } from "@/lib/xlsx-export";
import { formatCPF } from "@/lib/validation/cpf";
import { ATLETA_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import { atletaPassaFiltro, filtrosDaQueryString } from "@/lib/futebol/atletas-filtro";
import type { AtletaRow, AtletaStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<AtletaStatus, string> = {
  liberado: "Liberado",
  suspenso: "Suspenso",
  departamento_medico: "Departamento Médico",
};

const TIPO_CONTRATO_LABEL: Record<string, string> = Object.fromEntries(
  ATLETA_TIPO_CONTRATO_OPTIONS.map((opcao) => [opcao.value, opcao.label]),
);

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

/** Exporta a lista de Atletas para Excel, respeitando os mesmos filtros de Status/Posição/Contrato
 * e a busca por nome que estiverem ativos na tela (`AtletasResumoFiltros` monta esses mesmos
 * parâmetros no link com `filtrosParaQueryString` — ver docs/superpowers/specs/2026-09-09-atletas-
 * resumo-filtros-design.md). Sem parâmetro nenhum, exporta a lista inteira, igual à tela sem
 * nenhum filtro marcado. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filtros = filtrosDaQueryString(searchParams);
  const supabase = createClient();

  const { data } = await supabase.from("atletas").select("*").order("nome_completo", { ascending: true });
  const atletas = ((data ?? []) as AtletaRow[]).filter((a) =>
    atletaPassaFiltro(
      { status: a.status, posicao: a.posicao, tipoContrato: a.tipo_contrato, nome: a.nome_completo },
      filtros,
    ),
  );

  const linhas = atletas.map((a) => ({
    "Nome completo": a.nome_completo,
    RG: a.rg,
    CPF: formatCPF(a.cpf),
    "Data de nascimento": formatData(a.data_nascimento),
    Posição: a.posicao,
    "Número da camisa": a.numero_camisa ?? "",
    "Número CBF": a.numero_cbf ?? "",
    "Número FPF": a.numero_fpf ?? "",
    "Pé dominante": a.pe_dominante ? PE_LABEL[a.pe_dominante] ?? a.pe_dominante : "",
    Telefone: a.telefone ?? "",
    "Cidade natal": a.cidade_natal ?? "",
    "UF natal": a.uf_natal ?? "",
    "Endereço atual": a.endereco_atual ?? "",
    "Início no clube": formatData(a.data_inicio_clube),
    Empresário: a.empresario_nome ?? "",
    Status: STATUS_LABEL[a.status],
    "Fim do contrato": formatData(a.data_fim_contrato),
    "Tipo de contrato": a.tipo_contrato ? TIPO_CONTRATO_LABEL[a.tipo_contrato] ?? a.tipo_contrato : "",
    "Contrato de formação": a.tipo_contrato === "amador" ? (a.possui_contrato_formacao ? "Sim" : "Não") : "",
  }));

  return buildXlsxResponse("atletas.xlsx", [{ nome: "Atletas", linhas }]);
}
