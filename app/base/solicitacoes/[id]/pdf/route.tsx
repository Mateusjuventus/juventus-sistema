export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { STAFF_CHAVE_PIX_TIPOS, TIPO_CONTA_BANCARIA } from "@/lib/validation/schemas";
import { SolicitacaoDocument, type SolicitacaoPdfItem } from "@/lib/pdf/solicitacao-document";
import type { SolicitacaoItemBaseRow, SolicitacaoBaseRow } from "@/lib/supabase/types";

/** Espelha `app/solicitacoes/[id]/pdf/route.tsx` para o Futebol de Base. */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: solicitacaoData }, { data: itensData }] = await Promise.all([
    supabase.from("solicitacoes_base").select("*").eq("id", params.id).single(),
    supabase
      .from("solicitacao_itens_base")
      .select("*")
      .eq("solicitacao_id", params.id)
      .order("ordem", { ascending: true }),
  ]);

  if (!solicitacaoData) {
    return new NextResponse("Solicitação não encontrada.", { status: 404 });
  }

  const s = solicitacaoData as SolicitacaoBaseRow;
  const itensRows = (itensData ?? []) as SolicitacaoItemBaseRow[];

  const itens: SolicitacaoPdfItem[] = await Promise.all(
    itensRows.map(async (item) => ({
      quantidade: item.quantidade,
      item: item.item,
      fotoSrc: await getSignedPhotoUrl(supabase, item.foto_path),
      descricao: item.descricao,
      observacao: item.observacao,
      valor: item.valor,
      passageiro: item.passageiro,
      origem: item.origem,
      destino: item.destino,
      dataVoo: item.data_voo,
      horarioVoo: item.horario_voo,
    })),
  );

  const chavePixTipoLabel = s.chave_pix_tipo
    ? STAFF_CHAVE_PIX_TIPOS.find((t) => t.value === s.chave_pix_tipo)?.label ?? null
    : null;
  const tipoContaLabel = s.tipo_conta
    ? TIPO_CONTA_BANCARIA.find((t) => t.value === s.tipo_conta)?.label ?? null
    : null;

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <SolicitacaoDocument
      juventusLogoSrc={juventusLogoSrc}
      solicitacao={{
        tipo: s.tipo,
        dataSolicitacao: s.data_solicitacao,
        solicitante: s.solicitante,
        setor: s.setor,
        descricaoNecessidade: s.descricao_necessidade,
        prazoSugerido: s.prazo_sugerido,
        valor: s.valor,
        chavePix: s.chave_pix,
        chavePixTipoLabel,
        banco: s.banco,
        agencia: s.agencia,
        conta: s.conta,
        tipoContaLabel,
        titularConta: s.titular_conta,
      }}
      itens={itens}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="solicitacao-base-${s.tipo}.pdf"`,
    },
  });
}
