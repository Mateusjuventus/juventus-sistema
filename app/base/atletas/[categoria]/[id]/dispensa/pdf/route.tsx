export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { RelatorioDispensaDocument, montarAssinaturasDispensa } from "@/lib/pdf/relatorio-dispensa-document";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import { buscarAssinaturas } from "@/lib/assinaturas/actions";
import type { AtletaBaseRow } from "@/lib/supabase/types";

/**
 * Rota do PDF do Relatório de Dispensa — mesmo molde de
 * app/base/captacao/[id]/parecer/pdf/route.tsx: busca o atleta, monta o buffer, devolve
 * `application/pdf`. Compartilhada pelas duas telas que geram esse relatório (cadastro interno e
 * Treinador) — nenhuma delas guarda um arquivo, o PDF é sempre montado na hora com os dados salvos.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("atletas_base").select("*").eq("id", params.id).single();
  if (!data) return new NextResponse("Atleta não encontrado.", { status: 404 });

  const atleta = data as AtletaBaseRow;
  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const assinaturas = montarAssinaturasDispensa(await buscarAssinaturas("dispensa_base", atleta.id));

  const buffer = await renderToBuffer(
    <RelatorioDispensaDocument
      juventusLogoSrc={juventusLogoSrc}
      fotoSrc={fotoUrl}
      assinaturas={assinaturas}
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
