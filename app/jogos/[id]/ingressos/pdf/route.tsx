export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { IngressosDocument } from "@/lib/pdf/ingressos-document";
import type { IngressoCargaRow, IngressoSolicitacaoRow, JogoRow } from "@/lib/supabase/types";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: jogoData } = await supabase.from("jogos").select("*").eq("id", params.id).single();
  if (!jogoData) return new NextResponse("Jogo não encontrado.", { status: 404 });
  const jogo = jogoData as JogoRow;

  const [{ data: cargasData }, { data: solicitacoesData }, adversarioLogoUrl] = await Promise.all([
    supabase.from("ingressos_cargas").select("*").eq("jogo_id", params.id).order("data", { ascending: true }),
    supabase
      .from("ingressos_solicitacoes")
      .select("*")
      .eq("jogo_id", params.id)
      .order("created_at", { ascending: true }),
    getSignedPhotoUrl(supabase, jogo.adversario_logo_path),
  ]);

  const cargas = (cargasData ?? []) as IngressoCargaRow[];
  const solicitacoes = (solicitacoesData ?? []) as IngressoSolicitacaoRow[];

  if (cargas.length === 0 && solicitacoes.length === 0) {
    return new NextResponse(
      "Lance ao menos uma carga ou solicitação antes de gerar o PDF.",
      { status: 400 },
    );
  }

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <IngressosDocument
      jogo={jogo}
      juventusLogoSrc={juventusLogoSrc}
      adversarioLogoSrc={adversarioLogoUrl}
      cargas={cargas.map((c) => ({ data: c.data, quantidade: c.quantidade, observacoes: c.observacoes }))}
      solicitacoes={solicitacoes.map((s) => ({
        nomeSolicitante: s.nome_solicitante,
        quantidadeSolicitada: s.quantidade_solicitada,
        quantidadeAtendida: s.quantidade_atendida,
      }))}
    />,
  );

  const nomeArquivo = `carga-ingressos-juventus-x-${jogo.adversario_nome
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-${jogo.data_jogo}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
