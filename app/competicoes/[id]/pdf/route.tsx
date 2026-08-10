export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  CompeticaoResumoDocument,
  type CompeticaoResumoPdfFase,
  type CompeticaoResumoPdfJogo,
} from "@/lib/pdf/competicao-documents";
import { resolverEquipes } from "@/lib/futebol/competicao-classificacao";
import { carregarParaPdf } from "../pdf-shared";

const FASE_STATUS = { aguardando: "Aguardando", em_andamento: "Em andamento", encerrada: "Encerrada" } as const;

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** PDF "Resumo da Competição": dados de cadastro + estrutura (fases → grupos → equipes) + jogos
 * vinculados — o retrato geral, mesmo conteúdo da aba Visão geral + Fases e Grupos. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const pdfData = await carregarParaPdf(params.id);
  if (!pdfData) return new NextResponse("Competição não encontrada.", { status: 404 });
  const { carregada, juventusLogoSrc, subtitulo } = pdfData;
  const { competicao, fases, gruposPorFase, equipesPorGrupo, classificacoesPorGrupo, nomesGrupos, vinculos, jogosById } =
    carregada;

  const dados = [
    { label: "Federação/Organização", valor: competicao.federacao ?? "—" },
    { label: "Categoria", valor: competicao.categoria },
    { label: "Período", valor: `${formatData(competicao.data_inicio)} — ${formatData(competicao.data_termino)}` },
    {
      label: "Regras disciplinares",
      valor: `${competicao.regra_amarelos_suspensao} amarelos → ${competicao.regra_jogos_suspensao_amarelos} jogo(s) · vermelho → ${competicao.regra_jogos_suspensao_vermelho} jogo(s)`,
    },
  ];

  const fasesPdf: CompeticaoResumoPdfFase[] = fases.map((f) => ({
    nome: f.nome,
    status: FASE_STATUS[f.status],
    grupos: (gruposPorFase.get(f.id) ?? []).map((g) => ({
      nome: g.nome,
      equipes: resolverEquipes(
        (equipesPorGrupo.get(g.id) ?? []).map((e) => ({
          nome: e.nome,
          origemGrupoId: e.origem_grupo_id,
          origemPosicao: e.origem_posicao,
        })),
        nomesGrupos,
        classificacoesPorGrupo,
      ).map((r) => (r.projecao ? `${r.rotulo} (hoje: ${r.projecao})` : r.rotulo)),
    })),
  }));

  const jogosPdf: CompeticaoResumoPdfJogo[] = [...vinculos]
    .map((v) => ({ v, jogo: jogosById.get(v.jogo_id) }))
    .filter((x): x is { v: (typeof vinculos)[number]; jogo: NonNullable<ReturnType<typeof jogosById.get>> } =>
      Boolean(x.jogo),
    )
    .sort((a, b) => a.jogo.data_jogo.localeCompare(b.jogo.data_jogo))
    .map(({ v, jogo }) => {
      const fase = fases.find((f) => f.id === v.fase_id)?.nome;
      const grupo = v.grupo_id ? nomesGrupos.get(v.grupo_id) : undefined;
      const comPlacar = jogo.gols_pro !== null && jogo.gols_contra !== null;
      return {
        confronto: jogo.mandante ? `Juventus x ${jogo.adversario_nome}` : `${jogo.adversario_nome} x Juventus`,
        data: jogo.data_jogo,
        faseGrupo: [fase, grupo].filter(Boolean).join(" · ") || "—",
        placar: comPlacar
          ? jogo.mandante
            ? `${jogo.gols_pro} x ${jogo.gols_contra}`
            : `${jogo.gols_contra} x ${jogo.gols_pro}`
          : null,
      };
    });

  const buffer = await renderToBuffer(
    <CompeticaoResumoDocument
      juventusLogoSrc={juventusLogoSrc}
      geradoEm={new Date()}
      subtitulo={subtitulo}
      dados={dados}
      fases={fasesPdf}
      jogos={jogosPdf}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="resumo-${competicao.nome.toLowerCase().replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
