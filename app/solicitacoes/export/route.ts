export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildXlsxResponse } from "@/lib/xlsx-export";
import { SOLICITACAO_TIPOS, SOLICITACAO_STATUS, STAFF_CHAVE_PIX_TIPOS } from "@/lib/validation/schemas";
import type { SolicitacaoRow, SolicitacaoTipo, SolicitacaoStatus } from "@/lib/supabase/types";

function formatData(data: string | null): string {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

const TIPO_LABEL = Object.fromEntries(SOLICITACAO_TIPOS.map((t) => [t.value, t.label]));
const STATUS_LABEL = Object.fromEntries(SOLICITACAO_STATUS.map((s) => [s.value, s.label]));
const CHAVE_PIX_TIPO_LABEL = Object.fromEntries(STAFF_CHAVE_PIX_TIPOS.map((t) => [t.value, t.label]));

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") ?? "";
  const status = searchParams.get("status") ?? "";

  const supabase = createClient();
  let query = supabase.from("solicitacoes").select("*").order("data_solicitacao", { ascending: false });
  if (tipo) query = query.eq("tipo", tipo as SolicitacaoTipo);
  if (status) query = query.eq("status", status as SolicitacaoStatus);

  const { data } = await query;
  const solicitacoes = (data ?? []) as SolicitacaoRow[];

  const linhas = solicitacoes.map((s) => ({
    Tipo: TIPO_LABEL[s.tipo] ?? s.tipo,
    Data: formatData(s.data_solicitacao),
    Solicitante: s.solicitante,
    "Setor / C.C": s.setor,
    "Descrição da Necessidade / Observações": s.descricao_necessidade ?? "",
    "Prazo Sugerido": formatData(s.prazo_sugerido),
    Valor: s.valor ?? "",
    "Chave PIX": s.chave_pix ?? "",
    "Tipo de Chave PIX": s.chave_pix_tipo ? CHAVE_PIX_TIPO_LABEL[s.chave_pix_tipo] ?? "" : "",
    Passageiro: s.passageiro ?? "",
    Origem: s.origem ?? "",
    Destino: s.destino ?? "",
    "Data do Voo": formatData(s.data_voo),
    "Horário do Voo": s.horario_voo ? s.horario_voo.slice(0, 5) : "",
    Status: STATUS_LABEL[s.status] ?? s.status,
  }));

  return buildXlsxResponse("solicitacoes.xlsx", [{ nome: "Solicitações", linhas }]);
}
