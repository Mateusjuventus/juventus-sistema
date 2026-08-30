export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasProgramacao } from "@/lib/programacao/permissoes";
import { buscarMicrocicloData } from "@/lib/programacao/microciclo-data";
import { inicioDaSemana } from "@/lib/programacao/semana";
import { hojeBrasilia } from "@/lib/data-brasil";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import { MicrocicloDocument } from "@/lib/pdf/microciclo-document";

/**
 * Exportação do microciclo em PDF — acessível por quem já pode ver a Programação daquela categoria
 * (treinador só a sua, Base qualquer uma — mesma checagem de `getCategoriasProgramacao()` usada em
 * `/treinador` e `/base/programacao`, ver docs/superpowers/specs/2026-08-30-area-treinador-
 * programacao-design.md, "Rotas e telas"). `semana` na querystring escolhe qual semana exportar
 * (mesmo formato `YYYY-MM-DD` usado na grade); sem ela, ou com um valor inválido, cai na semana
 * atual.
 */
export async function GET(request: Request, { params }: { params: { categoria: string } }) {
  if (!ehCategoriaBaseValida(params.categoria)) {
    return new NextResponse("Categoria inválida.", { status: 400 });
  }

  const supabase = createClient();
  const categorias = await getCategoriasProgramacao(supabase);
  if (!categorias.includes(params.categoria)) {
    return new NextResponse("Você não tem permissão para exportar a Programação desta categoria.", { status: 403 });
  }

  const semanaParam = new URL(request.url).searchParams.get("semana");
  const inicioSemana =
    semanaParam && /^\d{4}-\d{2}-\d{2}$/.test(semanaParam) ? inicioDaSemana(semanaParam) : inicioDaSemana(hojeBrasilia());

  const dados = await buscarMicrocicloData(supabase, params.categoria, inicioSemana);

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(<MicrocicloDocument dados={dados} juventusLogoSrc={juventusLogoSrc} />);

  const nomeArquivo = `microciclo-${dados.categoria}-${inicioSemana}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
