export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasTreinador } from "@/lib/auth/role";
import { buildRelacionadosDataBase } from "@/lib/posters/relacionados-data";
import { nomeArquivoPoster } from "@/lib/posters/estilo";
import { RelacionadosDocument } from "@/lib/pdf/relacionados-document";

/**
 * Espelha `app/base/jogos/[id]/relacionados/pdf/route.tsx`, com a checagem de permissão que falta
 * pro lado do treinador — `buildRelacionadosDataBase` não checa nada por conta própria, sempre
 * dependeu do middleware bloquear `/base/*` de quem não tem o módulo Jogos, o que não cobre
 * `/treinador/*` (ver o comentário em `app/treinador/jogos/[id]/convocacao/page.tsx`).
 */
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

  const buffer = await renderToBuffer(
    <RelacionadosDocument
      competicao={dados.jogo.competicao}
      mandante={dados.jogo.mandante}
      adversarioLogoSrc={dados.adversarioLogoUrl}
      confrontoTexto={dados.confrontoTexto}
      dadosJogoTexto={dados.dadosJogoTexto}
      colunaEsquerda={dados.colunaEsquerda}
      colunaDireita={dados.colunaDireita}
    />,
  );

  const nomeArquivo = nomeArquivoPoster("relacionados", dados.jogo.adversario_nome, dados.jogo.data_jogo);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}.pdf"`,
    },
  });
}
