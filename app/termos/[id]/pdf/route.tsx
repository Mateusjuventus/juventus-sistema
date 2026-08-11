export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { TermoRetiradaDocument } from "@/lib/pdf/termo-retirada-document";
import { itensParaTotal, totalDoTermo } from "@/lib/futebol/termo-retirada";
import type { TermoRetiradaItemRow, TermoRetiradaRow } from "@/lib/supabase/types";

/** PDF do Termo de Responsabilidade — Retirada de Materiais, pronto pra imprimir e assinar. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: termoData }, { data: itensData }] = await Promise.all([
    supabase.from("termos_retirada").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("termo_retirada_itens").select("*").eq("termo_id", params.id).order("ordem"),
  ]);
  if (!termoData) return new NextResponse("Termo não encontrado.", { status: 404 });

  const termo = termoData as TermoRetiradaRow;
  const itens = (itensData ?? []) as TermoRetiradaItemRow[];

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <TermoRetiradaDocument
      juventusLogoSrc={juventusLogoSrc}
      termo={{
        numero: termo.numero,
        data: termo.data,
        tipo: termo.tipo,
        responsavelNome: termo.responsavel_nome,
        responsavelDocumento: termo.responsavel_documento,
        funcao: termo.funcao,
        departamento: termo.departamento,
        finalidade: termo.finalidade,
        previsaoDevolucao: termo.previsao_devolucao,
        textoResponsabilidade: termo.texto_responsabilidade,
        observacoes: termo.observacoes,
        devolvidoEm: termo.devolvido_em,
        devolucaoObservacoes: termo.devolucao_observacoes,
      }}
      itens={itens.map((i) => ({
        descricao: i.descricao,
        quantidade: i.quantidade,
        valorUnitario: i.valor_unitario,
      }))}
      total={totalDoTermo(itensParaTotal(itens))}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="termo-retirada-${String(termo.numero).padStart(4, "0")}.pdf"`,
    },
  });
}
