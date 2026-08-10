export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { CompeticaoCartoesDocument, type CompeticaoCartoesPdfLinha } from "@/lib/pdf/competicao-documents";
import { calcularDisciplina } from "@/lib/futebol/competicao-disciplina";
import { hojeBrasilia } from "@/lib/data-brasil";
import { carregarParaPdf } from "../../pdf-shared";

/** PDF do Controle de Cartões — respeita os mesmos filtros da tela (fase, grupo, atleta, tipo).
 * Como na tela: os dados vêm SEMPRE das súmulas dos jogos vinculados, nunca de cadastro manual. */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const pdfData = await carregarParaPdf(params.id);
  if (!pdfData) return new NextResponse("Competição não encontrada.", { status: 404 });
  const { carregada, juventusLogoSrc, subtitulo } = pdfData;
  const { competicao, vinculos, jogosOrdenados, eventosCartao, manuais, atletasById, fases, nomesGrupos } = carregada;

  const searchParams = new URL(request.url).searchParams;
  const faseFiltro = searchParams.get("fase") || "";
  const grupoFiltro = searchParams.get("grupo") || "";
  const atletaFiltro = searchParams.get("atleta") || "";
  const tipoFiltro = searchParams.get("tipo") || "";

  const jogosFiltrados = jogosOrdenados.filter((j) => {
    const vinculo = vinculos.find((v) => v.jogo_id === j.jogoId);
    if (faseFiltro && vinculo?.fase_id !== faseFiltro) return false;
    if (grupoFiltro && vinculo?.grupo_id !== grupoFiltro) return false;
    return true;
  });

  const disciplina =
    faseFiltro || grupoFiltro
      ? calcularDisciplina(
          {
            amarelosParaSuspensao: competicao.regra_amarelos_suspensao,
            jogosSuspensaoAmarelos: competicao.regra_jogos_suspensao_amarelos,
            jogosSuspensaoVermelho: competicao.regra_jogos_suspensao_vermelho,
          },
          jogosFiltrados,
          eventosCartao,
          manuais.map((m) => ({
            id: m.id,
            atletaId: m.atleta_id,
            origem: m.origem,
            motivo: m.motivo,
            jogosSuspensao: m.jogos_suspensao,
            dataDecisao: m.data_decisao,
          })),
          hojeBrasilia(),
        )
      : carregada.disciplina;

  const suspensosAtivos = new Set(
    disciplina.suspensoes.filter((s) => s.status === "ativa").map((s) => s.atletaId),
  );

  const linhas: CompeticaoCartoesPdfLinha[] = disciplina.cartoes
    .filter((c) => (atletaFiltro ? c.atletaId === atletaFiltro : true))
    .filter((c) => {
      if (tipoFiltro === "amarelo") return c.amarelos > 0;
      if (tipoFiltro === "vermelho") return c.vermelhos > 0;
      return true;
    })
    .sort((a, b) => b.amarelos + b.vermelhos * 10 - (a.amarelos + a.vermelhos * 10))
    .map((c) => ({
      atleta: atletasById.get(c.atletaId)?.nome_completo ?? "Atleta",
      amarelos: c.amarelos,
      vermelhos: c.vermelhos,
      ultimoCartao: c.ultimoJogoId
        ? jogosOrdenados.find((j) => j.jogoId === c.ultimoJogoId)?.confronto ?? "—"
        : "—",
      situacao: suspensosAtivos.has(c.atletaId) ? "Suspenso" : c.pendurado ? "Pendurado" : "Regular",
    }));

  if (linhas.length === 0) {
    return new NextResponse("Nenhum cartão registrado nas súmulas dos jogos vinculados (neste filtro).", {
      status: 400,
    });
  }

  const filtroPartes = [
    faseFiltro ? fases.find((f) => f.id === faseFiltro)?.nome : null,
    grupoFiltro ? nomesGrupos.get(grupoFiltro) : null,
    atletaFiltro ? atletasById.get(atletaFiltro)?.nome_completo : null,
    tipoFiltro ? (tipoFiltro === "amarelo" ? "Só amarelos" : "Só vermelhos") : null,
  ].filter(Boolean);

  const buffer = await renderToBuffer(
    <CompeticaoCartoesDocument
      juventusLogoSrc={juventusLogoSrc}
      geradoEm={new Date()}
      subtitulo={filtroPartes.length ? `${subtitulo} · ${filtroPartes.join(" · ")}` : subtitulo}
      linhas={linhas}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="cartoes-${competicao.nome.toLowerCase().replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
