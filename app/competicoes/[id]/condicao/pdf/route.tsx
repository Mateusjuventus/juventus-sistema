export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { CompeticaoCondicaoDocument, type CompeticaoCondicaoPdfLinha } from "@/lib/pdf/competicao-documents";
import { condicaoDoAtleta, type CondicaoJogoStatus } from "@/lib/futebol/competicao-disciplina";
import { hojeBrasilia } from "@/lib/data-brasil";
import { carregarParaPdf } from "../../pdf-shared";

const CONDICAO_LABEL: Record<CondicaoJogoStatus, string> = {
  apto: "APTO",
  atencao: "ATENÇÃO",
  suspenso: "SUSPENSO",
  irregular: "IRREGULAR",
};
const CONDICAO_ORDEM: Record<CondicaoJogoStatus, number> = { suspenso: 0, irregular: 1, atencao: 2, apto: 3 };

/** PDF da Condição de Jogo de um jogo vinculado (`?jogoId=`) — mesma regra da tela: inscritos +
 * convocados sem inscrição (irregulares). */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const pdfData = await carregarParaPdf(params.id);
  if (!pdfData) return new NextResponse("Competição não encontrada.", { status: 404 });
  const { carregada, juventusLogoSrc, subtitulo } = pdfData;
  const { competicao, disciplina, inscricoes, atletasById, jogosOrdenados } = carregada;

  const hojeStr = hojeBrasilia();
  const jogoIdParam = new URL(request.url).searchParams.get("jogoId");
  const jogo =
    (jogoIdParam ? jogosOrdenados.find((j) => j.jogoId === jogoIdParam) : null) ??
    jogosOrdenados.find((j) => j.data >= hojeStr) ??
    jogosOrdenados[jogosOrdenados.length - 1] ??
    null;
  if (!jogo) return new NextResponse("A competição não tem jogos vinculados.", { status: 400 });

  const supabase = createClient();
  let convocadosNaoInscritos: string[] = [];
  const { data: convocacaoData } = await supabase
    .from("convocacoes")
    .select("id")
    .eq("jogo_id", jogo.jogoId)
    .maybeSingle();
  if (convocacaoData) {
    const { data: convocadosData } = await supabase
      .from("convocacao_atletas")
      .select("atleta_id")
      .eq("convocacao_id", convocacaoData.id as string);
    const inscritosIds = new Set(inscricoes.map((i) => i.atleta_id));
    convocadosNaoInscritos = ((convocadosData ?? []) as { atleta_id: string }[])
      .map((c) => c.atleta_id)
      .filter((id) => !inscritosIds.has(id));
  }

  const nomesExtras = new Map<string, { nome_completo: string; posicao: string | null }>();
  const faltando = convocadosNaoInscritos.filter((id) => !atletasById.has(id));
  if (faltando.length) {
    const { data } = await supabase.from("atletas").select("id, nome_completo, posicao").in("id", faltando);
    for (const a of (data ?? []) as { id: string; nome_completo: string; posicao: string | null }[]) {
      nomesExtras.set(a.id, { nome_completo: a.nome_completo, posicao: a.posicao });
    }
  }

  const linhas: CompeticaoCondicaoPdfLinha[] = [
    ...inscricoes.map((i) => ({ atletaId: i.atleta_id, inscrito: true })),
    ...convocadosNaoInscritos.map((atletaId) => ({ atletaId, inscrito: false })),
  ]
    .map(({ atletaId, inscrito }) => {
      const condicao = condicaoDoAtleta(atletaId, jogo.jogoId, inscrito, disciplina);
      const atleta = atletasById.get(atletaId) ?? nomesExtras.get(atletaId) ?? null;
      return {
        atleta: atleta?.nome_completo ?? "Atleta",
        posicao: atleta?.posicao ?? "—",
        condicao: CONDICAO_LABEL[condicao.status],
        detalhe: condicao.detalhe,
        ordem: CONDICAO_ORDEM[condicao.status],
      };
    })
    .sort((a, b) => a.ordem - b.ordem || a.atleta.localeCompare(b.atleta, "pt-BR"))
    .map(({ ordem: _ordem, ...linha }) => linha);

  if (linhas.length === 0) {
    return new NextResponse("Nenhum atleta inscrito na competição ainda.", { status: 400 });
  }

  const buffer = await renderToBuffer(
    <CompeticaoCondicaoDocument
      juventusLogoSrc={juventusLogoSrc}
      geradoEm={new Date()}
      subtitulo={`${subtitulo} · ${jogo.confronto}`}
      linhas={linhas}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="condicao-de-jogo-${competicao.nome.toLowerCase().replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
