export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { CompeticaoInscritosDocument, type CompeticaoInscritosPdfLinha } from "@/lib/pdf/competicao-documents";
import { carregarParaPdf } from "../../pdf-shared";

function formatData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** PDF dos Atletas Inscritos na competição (com lista A/B e data de inscrição). */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const pdfData = await carregarParaPdf(params.id);
  if (!pdfData) return new NextResponse("Competição não encontrada.", { status: 404 });
  const { carregada, juventusLogoSrc, subtitulo } = pdfData;
  const { competicao, inscricoes, atletasById } = carregada;

  const linhas: CompeticaoInscritosPdfLinha[] = [...inscricoes]
    .map((i) => ({
      atleta: atletasById.get(i.atleta_id)?.nome_completo ?? "Atleta",
      posicao: atletasById.get(i.atleta_id)?.posicao ?? "—",
      lista: i.lista ? `Lista ${i.lista}` : "—",
      dataInscricao: formatData(i.data_inscricao),
    }))
    .sort((a, b) => a.atleta.localeCompare(b.atleta, "pt-BR"));

  if (linhas.length === 0) {
    return new NextResponse("Nenhum atleta inscrito na competição ainda.", { status: 400 });
  }

  const buffer = await renderToBuffer(
    <CompeticaoInscritosDocument
      juventusLogoSrc={juventusLogoSrc}
      geradoEm={new Date()}
      subtitulo={subtitulo}
      linhas={linhas}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="inscritos-${competicao.nome.toLowerCase().replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
