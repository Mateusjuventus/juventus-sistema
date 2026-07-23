export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildXlsxResponse } from "@/lib/xlsx-export";
import { SOLICITACAO_TIPOS, SOLICITACAO_STATUS, STAFF_CHAVE_PIX_TIPOS, TIPO_CONTA_BANCARIA } from "@/lib/validation/schemas";
import type { SolicitacaoItemBaseRow, SolicitacaoBaseRow, SolicitacaoTipo, SolicitacaoStatus } from "@/lib/supabase/types";

function formatData(data: string | null): string {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

const TIPO_LABEL = Object.fromEntries(SOLICITACAO_TIPOS.map((t) => [t.value, t.label]));
const STATUS_LABEL = Object.fromEntries(SOLICITACAO_STATUS.map((s) => [s.value, s.label]));
const CHAVE_PIX_TIPO_LABEL = Object.fromEntries(STAFF_CHAVE_PIX_TIPOS.map((t) => [t.value, t.label]));
const TIPO_CONTA_LABEL = Object.fromEntries(TIPO_CONTA_BANCARIA.map((t) => [t.value, t.label]));

/** Espelha `app/solicitacoes/export/route.ts` para o Futebol de Base. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") ?? "";
  const status = searchParams.get("status") ?? "";

  const supabase = createClient();
  let query = supabase.from("solicitacoes_base").select("*").order("data_solicitacao", { ascending: false });
  if (tipo) query = query.eq("tipo", tipo as SolicitacaoTipo);
  if (status) query = query.eq("status", status as SolicitacaoStatus);

  const { data } = await query;
  const solicitacoes = (data ?? []) as SolicitacaoBaseRow[];

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
    Banco: s.banco ?? "",
    Agência: s.agencia ?? "",
    Conta: s.conta ?? "",
    "Tipo de Conta": s.tipo_conta ? TIPO_CONTA_LABEL[s.tipo_conta] ?? "" : "",
    "Titular da Conta": s.titular_conta ?? "",
    Status: STATUS_LABEL[s.status] ?? s.status,
  }));

  const solicitacaoPorId = new Map(solicitacoes.map((s) => [s.id, s]));
  const idsComItens = solicitacoes
    .filter(
      (s) =>
        s.tipo === "compra" ||
        s.tipo === "pagamento" ||
        s.tipo === "reembolso" ||
        s.tipo === "passagem_aerea" ||
        s.tipo === "transporte" ||
        s.tipo === "hospedagem",
    )
    .map((s) => s.id);

  const { data: itensData } =
    idsComItens.length > 0
      ? await supabase
          .from("solicitacao_itens_base")
          .select("*")
          .in("solicitacao_id", idsComItens)
          .order("solicitacao_id", { ascending: true })
          .order("ordem", { ascending: true })
      : { data: [] };
  const itens = (itensData ?? []) as SolicitacaoItemBaseRow[];

  const linhasItens = itens
    .map((item) => {
      const s = solicitacaoPorId.get(item.solicitacao_id);
      if (!s) return null;
      return {
        Tipo: TIPO_LABEL[s.tipo] ?? s.tipo,
        Data: formatData(s.data_solicitacao),
        Solicitante: s.solicitante,
        "Item / Descrição / Passageiro": item.item ?? item.descricao ?? item.passageiro ?? "",
        Quantidade: item.quantidade ?? "",
        Valor: item.valor ?? "",
        Origem: item.origem ?? "",
        Destino: item.destino ?? "",
        "Data do Voo": formatData(item.data_voo),
        "Horário do Voo": item.horario_voo ? item.horario_voo.slice(0, 5) : "",
        Cidade: item.cidade ?? "",
        Hotel: item.hotel ?? "",
        Entrada: formatData(item.data_entrada),
        Saída: formatData(item.data_saida),
        "Tipo de Acomodação": item.tipo_acomodacao ?? "",
        Observação: item.observacao ?? "",
      };
    })
    .filter((linha): linha is NonNullable<typeof linha> => linha !== null);

  return buildXlsxResponse("solicitacoes-base.xlsx", [
    { nome: "Solicitações", linhas },
    { nome: "Itens", linhas: linhasItens },
  ]);
}
