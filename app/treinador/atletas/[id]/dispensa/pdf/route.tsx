export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { getCategoriasTreinador } from "@/lib/auth/role";
import { RelatorioDispensaDocument } from "@/lib/pdf/relatorio-dispensa-document";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import type { AtletaBaseRow } from "@/lib/supabase/types";

/**
 * Rota do PDF do Relatório de Dispensa, do lado do Treinador — não pode reaproveitar
 * `app/base/atletas/[categoria]/[id]/dispensa/pdf/route.tsx` porque o middleware redireciona
 * qualquer usuário com role "treinador" pra fora de rotas fora de `/treinador` (ver
 * `lib/supabase/middleware.ts`). Mesma checagem de permissão da tela
 * (`app/treinador/atletas/[id]/dispensa/page.tsx`): só as categorias liberadas pra esse treinador.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const categorias = await getCategoriasTreinador(supabase);
  if (categorias.length === 0) return new NextResponse("Não autorizado.", { status: 403 });

  const { data } = await supabase.from("atletas_base").select("*").eq("id", params.id).single();
  if (!data) return new NextResponse("Atleta não encontrado.", { status: 404 });

  const atleta = data as AtletaBaseRow;
  if (!atleta.categoria || !categorias.includes(atleta.categoria)) {
    return new NextResponse("Não autorizado.", { status: 403 });
  }

  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);
  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <RelatorioDispensaDocument
      juventusLogoSrc={juventusLogoSrc}
      fotoSrc={fotoUrl}
      atleta={{
        nome: atleta.nome_completo,
        dataNascimento: atleta.data_nascimento,
        categoria: categoriaBaseLabel(atleta.categoria),
        posicao: atleta.posicao,
        dataInicioClube: atleta.data_inicio_clube,
        dispensaData: atleta.dispensa_data,
        motivo: atleta.dispensa_motivo,
        notaTecnica: atleta.dispensa_nota_tecnica,
        notaFisica: atleta.dispensa_nota_fisica,
        notaTatica: atleta.dispensa_nota_tatica,
        notaComportamental: atleta.dispensa_nota_comportamental,
      }}
      emitidoEm={new Date()}
    />,
  );

  const nomeArquivo = `relatorio-dispensa-${atleta.nome_completo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
