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
 * PDF (paisagem) da Relação de Captação/Avaliação — a mesma lista da tela `/base/captacao`, com os
 * MESMOS filtros que estiverem aplicados lá (busca por nome, status, categoria, UF — o botão "Gerar
 * PDF" já manda esses parâmetros na URL, ver app/base/captacao/page.tsx). Sem filtro nenhum na URL,
 * sai o banco completo. Ordena por Nº, do primeiro candidato ao mais recente.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";
  const categoria = searchParams.get("categoria")?.trim() ?? "";
  const uf = searchParams.get("uf")?.trim() ?? "";

  const supabase = createClient();
  // Mesmo filtro do que a lista principal (/base/captacao): "Inscrição enviada" nunca sai no PDF —
  // fica só na fila de Aprovações até ser decidida.
  let query = supabase
    .from("captacao_base")
    .select("*")
    .neq("status", "inscricao")
    .order("numero", { ascending: true });
  if (q) query = query.ilike("nome_completo", `%${q}%`);
  if (status) query = query.eq("status", status);
  if (categoria) query = query.eq("categoria", categoria);
  if (uf) query = query.eq("uf", uf.toUpperCase());

  const { data } = await query;
  const candidatos = (data ?? []) as CaptacaoBaseRow[];
  const filtrado = Boolean(q || status || categoria || uf);

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
    <CaptacaoDocument
      juventusLogoSrc={juventusLogoSrc}
      emitidoEm={hojeBrasilia()}
      candidatos={linhas}
      filtrado={filtrado}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="captacao-avaliacao-${hojeBrasilia()}.pdf"`,
    },
  });
}
