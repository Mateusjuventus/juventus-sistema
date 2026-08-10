export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  CompeticaoClassificacaoDocument,
  type CompeticaoClassificacaoPdfGrupo,
} from "@/lib/pdf/competicao-documents";
import { jogosAJogar, resolverEquipes } from "@/lib/futebol/competicao-classificacao";
import { CRITERIO_LABEL, normalizarCriterios } from "@/lib/futebol/competicao-desempate";
import { carregarParaPdf } from "../../pdf-shared";

/** PDF da Classificação — tabelas por grupo e, pra grupos de fases futuras, as vagas projetadas
 * com o possível confronto de hoje (mesmo conteúdo da aba Classificação). */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const pdfData = await carregarParaPdf(params.id);
  if (!pdfData) return new NextResponse("Competição não encontrada.", { status: 404 });
  const { carregada, juventusLogoSrc, subtitulo } = pdfData;
  const { fases, gruposPorFase, equipesPorGrupo, classificacoesPorGrupo, nomesGrupos, competicao } = carregada;

  const grupos: CompeticaoClassificacaoPdfGrupo[] = [];
  for (const fase of fases) {
    for (const grupo of gruposPorFase.get(fase.id) ?? []) {
      const equipes = equipesPorGrupo.get(grupo.id) ?? [];
      const temVaga = equipes.some((e) => e.nome === null);
      if (temVaga) {
        const resolvidas = resolverEquipes(
          equipes.map((e) => ({ nome: e.nome, origemGrupoId: e.origem_grupo_id, origemPosicao: e.origem_posicao })),
          nomesGrupos,
          classificacoesPorGrupo,
        );
        grupos.push({
          nome: grupo.nome,
          faseNome: fase.nome,
          linhas: [],
          vagas: resolvidas.map((r) => (r.projecao ? `${r.rotulo} — hoje: ${r.projecao}` : `${r.rotulo} — a definir`)),
        });
      } else {
        const classificacao = classificacoesPorGrupo.get(grupo.id) ?? [];
        if (classificacao.length === 0) continue;
        grupos.push({
          nome: grupo.nome,
          faseNome: fase.nome,
          vagas: [],
          linhas: classificacao.map((l, i) => ({
            posicao: i + 1,
            equipe: l.equipe,
            pontos: l.pontos,
            jogos: l.jogos,
            aJogar: jogosAJogar(classificacao.length, l.jogos),
            vitorias: l.vitorias,
            empates: l.empates,
            derrotas: l.derrotas,
            golsPro: l.golsPro,
            golsContra: l.golsContra,
            saldo: l.saldo,
            cartoesAmarelos: l.cartoesAmarelos,
            cartoesVermelhos: l.cartoesVermelhos,
            juventus: l.equipe.trim().toLocaleLowerCase("pt-BR") === "juventus",
          })),
        });
      }
    }
  }

  if (grupos.length === 0) {
    return new NextResponse("A competição ainda não tem grupos com equipes cadastradas.", { status: 400 });
  }

  const buffer = await renderToBuffer(
    <CompeticaoClassificacaoDocument
      juventusLogoSrc={juventusLogoSrc}
      geradoEm={new Date()}
      subtitulo={subtitulo}
      grupos={grupos}
      criterios={normalizarCriterios(competicao.criterios_desempate)
        .map((c) => CRITERIO_LABEL[c])
        .join(" → ")}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="classificacao-${competicao.nome.toLowerCase().replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
