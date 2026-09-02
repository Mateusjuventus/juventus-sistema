export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasProgramacao } from "@/lib/programacao/permissoes";
import { TODAS_CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import { buscarProgramacaoGeralData } from "@/lib/programacao/programacao-geral-data";
import { inicioDaSemana } from "@/lib/programacao/semana";
import { hojeBrasilia } from "@/lib/data-brasil";
import { ProgramacaoGeralDocument } from "@/lib/pdf/programacao-geral-document";

/**
 * Exportação da Programação Geral em PDF (ver docs/superpowers/specs/2026-09-02-programacao-copiar-
 * dia-layout-geral-design.md, Parte 3) — compila as 7 categorias da semana num único documento.
 * Só pra quem enxerga as 7 categorias (Base — `getCategoriasProgramacao()` retornando as 7 é o
 * mesmo proxy de "é Base, não treinador" que `resolverCategoriasProgramacao` já garante; treinador
 * nunca recebe as 7, então não precisa de nenhuma checagem de permissão nova). `semana` na
 * querystring escolhe qual semana exportar (mesmo formato `YYYY-MM-DD` usado na grade); sem ela, ou
 * com um valor inválido, cai na semana atual.
 */
export async function GET(request: Request) {
  const supabase = createClient();
  const categorias = await getCategoriasProgramacao(supabase);
  if (categorias.length !== TODAS_CATEGORIAS_BASE.length) {
    return new NextResponse("Você não tem permissão para gerar a Programação Geral.", { status: 403 });
  }

  const semanaParam = new URL(request.url).searchParams.get("semana");
  const inicioSemana =
    semanaParam && /^\d{4}-\d{2}-\d{2}$/.test(semanaParam) ? inicioDaSemana(semanaParam) : inicioDaSemana(hojeBrasilia());

  const dados = await buscarProgramacaoGeralData(supabase, inicioSemana);

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(<ProgramacaoGeralDocument dados={dados} juventusLogoSrc={juventusLogoSrc} />);

  const nomeArquivo = `programacao-geral-${inicioSemana}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
