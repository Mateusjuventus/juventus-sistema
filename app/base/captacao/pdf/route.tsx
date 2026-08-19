export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { hojeBrasilia } from "@/lib/data-brasil";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import { captacaoStatusLabel } from "@/lib/futebol/captacao";
import { CaptacaoDocument, type CaptacaoPdfLinha } from "@/lib/pdf/captacao-document";
import type { CaptacaoBaseRow } from "@/lib/supabase/types";

/**
 * PDF (paisagem) da Relação de Captação/Avaliação — a mesma lista da tela `/base/captacao`, sem
 * filtro nenhum (o Mateus pediu "me gera um PDF também" pro banco completo). Ordena por Nº, do
 * primeiro candidato ao mais recente.
 */
export async function GET() {
  const supabase = createClient();
  const { data } = await supabase.from("captacao_base").select("*").order("numero", { ascending: true });
  const candidatos = (data ?? []) as CaptacaoBaseRow[];

  const linhas: CaptacaoPdfLinha[] = candidatos.map((c) => ({
    numero: c.numero,
    dataInicio: c.data_inicio,
    nome: c.nome_completo,
    nascimento: c.data_nascimento,
    posicao: c.posicao,
    categoria: c.categoria ? categoriaBaseLabel(c.categoria) : null,
    cidade: c.cidade ? `${c.cidade}${c.uf ? `/${c.uf}` : ""}` : null,
    indicacao: c.indicacao,
    desejaAlojamento: c.deseja_alojamento,
    status: captacaoStatusLabel(c.status),
  }));

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <CaptacaoDocument juventusLogoSrc={juventusLogoSrc} emitidoEm={hojeBrasilia()} candidatos={linhas} />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="captacao-avaliacao-${hojeBrasilia()}.pdf"`,
    },
  });
}
