export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasTreinador } from "@/lib/auth/role";
import { buildRelacionadosDataBase } from "@/lib/posters/relacionados-data";
import { nomeArquivoPoster } from "@/lib/posters/estilo";
import { relacionadosImagemJsx } from "@/lib/posters/relacionados-imagem";
import { renderizarPosterComoJpeg } from "@/lib/posters/renderizar-imagem";

/** Espelha `app/base/jogos/[id]/relacionados/jpg/route.tsx` — ver o comentário de permissão em
 * `app/treinador/jogos/[id]/relacionados/pdf/route.tsx`. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const categorias = await getCategoriasTreinador(supabase);
  const { data: jogo } = await supabase.from("jogos_base").select("categoria").eq("id", params.id).maybeSingle();
  if (!jogo || categorias.length === 0 || !categorias.includes(jogo.categoria)) {
    return new NextResponse("Você não tem permissão para acessar este jogo.", { status: 403 });
  }

  const dados = await buildRelacionadosDataBase(params.id);
  if (!dados) {
    return new NextResponse(
      "Ainda não há convocação registrada para este jogo. Registre a convocação antes de gerar o pôster de Relacionados.",
      { status: 400 },
    );
  }

  const jsx = relacionadosImagemJsx({
    competicao: dados.jogo.competicao,
    mandante: dados.jogo.mandante,
    adversarioLogoUrl: dados.adversarioLogoUrl,
    confrontoTexto: dados.confrontoTexto,
    dadosJogoTexto: dados.dadosJogoTexto,
    colunaEsquerda: dados.colunaEsquerda,
    colunaDireita: dados.colunaDireita,
  });

  const jpgBuffer = await renderizarPosterComoJpeg(jsx as any);

  const nomeArquivo = nomeArquivoPoster("relacionados", dados.jogo.adversario_nome, dados.jogo.data_jogo);

  return new NextResponse(new Uint8Array(jpgBuffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": `inline; filename="${nomeArquivo}.jpg"`,
    },
  });
}
