export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasProgramacao } from "@/lib/programacao/permissoes";
import { buscarMicrocicloData } from "@/lib/programacao/microciclo-data";
import { inicioDaSemana } from "@/lib/programacao/semana";
import { hojeBrasilia } from "@/lib/data-brasil";
import { ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import { microcicloImagemJsx, MICROCICLO_IMAGEM_LARGURA, MICROCICLO_IMAGEM_ALTURA_CANVAS } from "@/lib/posters/microciclo-imagem";
import { renderizarImagemLargaComoJpeg } from "@/lib/posters/renderizar-imagem";

/** Mesma checagem de permissão e dados de `.../exportar/pdf/route.tsx` — ver o comentário lá. */
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

  const jpgBuffer = await renderizarImagemLargaComoJpeg(microcicloImagemJsx(dados), {
    width: MICROCICLO_IMAGEM_LARGURA,
    alturaCanvas: MICROCICLO_IMAGEM_ALTURA_CANVAS,
  });

  const nomeArquivo = `microciclo-${dados.categoria}-${inicioSemana}.jpg`;

  return new NextResponse(new Uint8Array(jpgBuffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
