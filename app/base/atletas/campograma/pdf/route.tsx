export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { agruparPorPosicaoEspecifica, type AtletaCampograma } from "@/lib/futebol/campograma";
import { CampogramaDocument } from "@/lib/pdf/campograma-document";
import { categoriaBaseLabel, ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import type { AtletaBaseRow } from "@/lib/supabase/types";

/**
 * PDF do Campograma — mesma consulta da tela (`app/base/atletas/campograma/page.tsx`), servindo o
 * relatório de uma folha só descrito em docs/superpowers/specs/
 * 2026-08-26-campograma-foto-classificacao-design.md.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const categoriaParam = url.searchParams.get("categoria") ?? "";
  const categoria = ehCategoriaBaseValida(categoriaParam) ? categoriaParam : "sub20";

  const supabase = createClient();
  const { data } = await supabase
    .from("atletas_base")
    .select("id, nome_completo, apelido, posicao, foto_path, classificacao, tipo_contrato, data_nascimento, status")
    .eq("categoria", categoria)
    .neq("status", "dispensado")
    .order("nome_completo", { ascending: true });

  const atletas = (data ?? []) as Pick<
    AtletaBaseRow,
    | "id"
    | "nome_completo"
    | "apelido"
    | "posicao"
    | "foto_path"
    | "classificacao"
    | "tipo_contrato"
    | "data_nascimento"
    | "status"
  >[];

  const fotoUrls = await Promise.all(atletas.map((a) => getSignedPhotoUrl(supabase, a.foto_path)));

  const paraCampograma: AtletaCampograma[] = atletas.map((a, i) => ({
    id: a.id,
    nome: a.nome_completo,
    apelido: a.apelido,
    posicao: a.posicao,
    fotoUrl: fotoUrls[i],
    classificacao: a.classificacao,
    tipoContrato: a.tipo_contrato,
    dataNascimento: a.data_nascimento,
    status: a.status,
  }));

  const grupos = agruparPorPosicaoEspecifica(paraCampograma);

  const juventusLogoSrc = {
    data: readFileSync(path.join(process.cwd(), "public/brand/juventus-escudo-mark.png")),
    format: "png" as const,
  };
  const juventusWatermarkSrc = {
    data: readFileSync(path.join(process.cwd(), "public/brand/juventus-escudo.png")),
    format: "png" as const,
  };

  const buffer = await renderToBuffer(
    <CampogramaDocument
      juventusLogoSrc={juventusLogoSrc}
      juventusWatermarkSrc={juventusWatermarkSrc}
      categoriaLabel={categoriaBaseLabel(categoria)}
      geradoEm={new Date()}
      grupos={grupos}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="campograma-${categoria}.pdf"`,
    },
  });
}
