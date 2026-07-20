export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { EstoqueFichaDocument, type EstoqueFichaPdfItem } from "@/lib/pdf/estoque-ficha-document";
import type { EstoqueSaidaItemBaseRow, EstoqueSaidaBaseRow } from "@/lib/supabase/types";

/** Espelha `app/estoque/[categoria]/saida/[saidaId]/pdf/route.tsx` para o Futebol de Base — reaproveita
 * o mesmo `EstoqueFichaDocument`, sempre com `categoria: "esportivo"` (única categoria que o Base
 * tem) e o subtítulo trocado pra "Futebol de Base" (o padrão do documento diz "Futebol Profissional"). */
export async function GET(_request: Request, { params }: { params: { saidaId: string } }) {
  const supabase = createClient();
  const [{ data: saidaData }, { data: itensData }] = await Promise.all([
    supabase.from("estoque_saidas_base").select("*").eq("id", params.saidaId).single(),
    supabase
      .from("estoque_saida_itens_base")
      .select("*")
      .eq("saida_id", params.saidaId)
      .order("ordem", { ascending: true }),
  ]);
  if (!saidaData) return new NextResponse("Ficha não encontrada.", { status: 404 });

  const saida = saidaData as EstoqueSaidaBaseRow;
  const itensRows = (itensData ?? []) as EstoqueSaidaItemBaseRow[];
  const itens: EstoqueFichaPdfItem[] = itensRows.map((item) => ({
    nome: item.nome,
    tamanho: item.tamanho,
    codigo: item.codigo,
    quantidade: Number(item.quantidade),
  }));

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <EstoqueFichaDocument
      juventusLogoSrc={juventusLogoSrc}
      subtitulo="Departamento de Futebol de Base"
      ficha={{
        categoria: "esportivo",
        numero: saida.numero,
        data: saida.data,
        nomeDestinatario: saida.nome_destinatario,
        funcao: saida.funcao,
        departamento: saida.departamento,
        observacoes: saida.observacoes,
      }}
      itens={itens}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ficha-estoque-base-${String(saida.numero).padStart(4, "0")}.pdf"`,
    },
  });
}
