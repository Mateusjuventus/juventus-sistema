export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  CompeticaoSuspensoesDocument,
  type CompeticaoSuspensoesPdfLinha,
} from "@/lib/pdf/competicao-documents";
import { carregarParaPdf } from "../../pdf-shared";

function formatData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** PDF do Controle de Suspensões — automáticas (motor de regras) e manuais, com jogos
 * cumpridos/restantes e o próximo jogo de cumprimento. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const pdfData = await carregarParaPdf(params.id);
  if (!pdfData) return new NextResponse("Competição não encontrada.", { status: 404 });
  const { carregada, juventusLogoSrc, subtitulo } = pdfData;
  const { competicao, disciplina, atletasById, jogosOrdenados } = carregada;

  const confrontoPorJogo = new Map(jogosOrdenados.map((j) => [j.jogoId, j.confronto]));
  const linhas: CompeticaoSuspensoesPdfLinha[] = [...disciplina.suspensoes]
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "ativa" ? -1 : 1;
      return b.dataInicio.localeCompare(a.dataInicio);
    })
    .map((s) => ({
      atleta: atletasById.get(s.atletaId)?.nome_completo ?? "Atleta",
      tipo: s.tipo === "automatica" ? "Automática" : "Manual",
      motivo: s.motivo,
      jogoOrigem: s.jogoOrigemId
        ? confrontoPorJogo.get(s.jogoOrigemId) ?? "—"
        : `Decisão de ${formatData(s.dataInicio)}`,
      jogos: s.jogosSuspensao,
      cumpridos: s.jogosCumpridos,
      restantes: s.jogosRestantes,
      proximoJogo: s.proximoJogoCumprirId
        ? confrontoPorJogo.get(s.proximoJogoCumprirId) ?? "—"
        : s.status === "ativa"
          ? "Aguardando próximo jogo"
          : "—",
      status: s.status === "ativa" ? "Ativa" : "Cumprida",
    }));

  if (linhas.length === 0) {
    return new NextResponse("Nenhuma suspensão na competição.", { status: 400 });
  }

  const buffer = await renderToBuffer(
    <CompeticaoSuspensoesDocument
      juventusLogoSrc={juventusLogoSrc}
      geradoEm={new Date()}
      subtitulo={subtitulo}
      linhas={linhas}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="suspensoes-${competicao.nome.toLowerCase().replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
