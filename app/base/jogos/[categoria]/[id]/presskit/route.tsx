export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { PresskitDocument, type AtletaPresskitItem } from "@/lib/pdf/presskit-document";
import type {
  AtletaBaseRow,
  ComissaoTecnicaBaseRow,
  ConvocacaoAtletaBaseRow,
  ConvocacaoBaseRow,
  ConvocacaoComissaoBaseRow,
  JogoBaseRow,
} from "@/lib/supabase/types";

/** Espelha `app/jogos/[id]/presskit/route.tsx` para o Futebol de Base. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: jogoData } = await supabase.from("jogos_base").select("*").eq("id", params.id).single();
  if (!jogoData) {
    return new NextResponse("Jogo não encontrado.", { status: 404 });
  }
  const jogo = jogoData as JogoBaseRow;

  const { data: convocacaoData } = await supabase
    .from("convocacoes_base")
    .select("*")
    .eq("jogo_id", params.id)
    .maybeSingle();

  if (!convocacaoData) {
    return new NextResponse(
      "Ainda não há convocação registrada para este jogo. Registre a convocação antes de gerar o presskit.",
      { status: 400 },
    );
  }
  const convocacao = convocacaoData as ConvocacaoBaseRow;

  const [{ data: caData }, { data: ccData }, adversarioLogoUrl] = await Promise.all([
    supabase.from("convocacao_atletas_base").select("*, atleta:atletas_base(*)").eq("convocacao_id", convocacao.id),
    supabase
      .from("convocacao_comissao_base")
      .select("*, pessoa:comissao_tecnica_base(nome_completo)")
      .eq("convocacao_id", convocacao.id),
    getSignedPhotoUrl(supabase, jogo.adversario_logo_path),
  ]);

  const convocacaoAtletas = (caData ?? []) as (ConvocacaoAtletaBaseRow & { atleta: AtletaBaseRow })[];
  const porNumero = (a: AtletaBaseRow, b: AtletaBaseRow) => (a.numero_camisa ?? 999) - (b.numero_camisa ?? 999);
  const atletasTitulares = convocacaoAtletas
    .filter((c) => c.status === "titular")
    .map((c) => c.atleta)
    .sort(porNumero);
  const atletasReservas = convocacaoAtletas
    .filter((c) => c.status === "reserva")
    .map((c) => c.atleta)
    .sort(porNumero);

  const comFoto = async (atletas: AtletaBaseRow[]): Promise<AtletaPresskitItem[]> =>
    Promise.all(
      atletas.map(async (atleta) => ({
        atleta,
        fotoSrc: await getSignedPhotoUrl(supabase, atleta.foto_path),
      })),
    );
  const [titulares, reservas] = await Promise.all([comFoto(atletasTitulares), comFoto(atletasReservas)]);

  const comissaoNomes = ((ccData ?? []) as (ConvocacaoComissaoBaseRow & {
    pessoa: Pick<ComissaoTecnicaBaseRow, "nome_completo"> | null;
  })[])
    .map((c) => c.pessoa?.nome_completo)
    .filter((nome): nome is string => Boolean(nome));

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <PresskitDocument
      jogo={jogo}
      juventusLogoSrc={juventusLogoSrc}
      adversarioLogoSrc={adversarioLogoUrl}
      titulares={titulares}
      reservas={reservas}
      capitaoId={convocacao.capitao_atleta_id}
      comissaoNomes={comissaoNomes}
    />,
  );

  const nomeArquivo = `presskit-juventus-x-${jogo.adversario_nome
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-${jogo.data_jogo}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
