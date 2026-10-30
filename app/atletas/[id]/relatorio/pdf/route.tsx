export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { buscarEstatisticasAtleta } from "@/lib/futebol/estatisticas-atleta-query";
import { textoFiltroCompeticaoAtleta } from "@/lib/futebol/ficha-atleta";
import { AtletaRelatorioDocument } from "@/lib/pdf/atleta-relatorio-document";
import { ATLETA_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import type { AtletaRow } from "@/lib/supabase/types";

const TABELAS = {
  jogos: "jogos",
  convocacoes: "convocacoes",
  convocacaoAtletas: "convocacao_atletas",
  sumulas: "sumulas",
  sumulaEventos: "sumula_eventos",
  competicaoJogos: "competicao_jogos",
  competicoes: "competicoes",
  temporadas: "temporadas",
  categoriaJogos: ["profissional"],
};

function naturalidade(cidade: string | null, uf: string | null): string | null {
  if (cidade && uf) return `${cidade}/${uf}`;
  return cidade || uf || null;
}

/** Gera o relatório em PDF da aba "Dados de Jogo" do atleta (Futebol Profissional) — respeita o
 * filtro de Competição que estava marcado na tela (substituiu o filtro de período em 2026-10-27,
 * ver `lib/futebol/estatisticas-atleta-query.ts`), e inclui os Dados Pessoais quando
 * `incluirDadosPessoais=sim`. Ver docs/superpowers/specs/2026-08-04-estatisticas-atleta-design.md. */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const url = new URL(request.url);
  const filtrado = url.searchParams.get("filtrado") === "1";
  const competicaoIds = filtrado ? url.searchParams.getAll("competicaoId") : undefined;
  const incluirSemCompeticao = filtrado ? url.searchParams.get("semCompeticao") === "sim" : undefined;
  const incluirDadosPessoais = url.searchParams.get("incluirDadosPessoais") === "sim";

  const supabase = createClient();
  const { data: atletaData } = await supabase.from("atletas").select("*").eq("id", params.id).single();
  if (!atletaData) return new NextResponse("Atleta não encontrado.", { status: 404 });

  const atleta = atletaData as AtletaRow;
  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);
  const subtitulo = `${atleta.posicao}${atleta.numero_camisa ? ` · Nº ${atleta.numero_camisa}` : ""}`;

  const { stats, duracaoReferencia, detalhePorCompeticao } = await buscarEstatisticasAtleta(
    supabase,
    atleta.id,
    TABELAS,
    { competicaoIds, incluirSemCompeticao },
  );

  const periodoTexto = textoFiltroCompeticaoAtleta(competicaoIds, detalhePorCompeticao.map((g) => g.titulo));

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const dadosPessoais = incluirDadosPessoais
    ? {
        rg: atleta.rg,
        cpf: atleta.cpf,
        dataNascimento: atleta.data_nascimento,
        telefone: atleta.telefone,
        naturalidade: naturalidade(atleta.cidade_natal, atleta.uf_natal),
        tipoContrato: atleta.tipo_contrato
          ? ATLETA_TIPO_CONTRATO_OPTIONS.find((o) => o.value === atleta.tipo_contrato)?.label ?? atleta.tipo_contrato
          : null,
        dataInicioClube: atleta.data_inicio_clube,
        dataFimContrato: atleta.data_fim_contrato,
        empresarioNome: atleta.empresario_nome,
      }
    : null;

  const buffer = await renderToBuffer(
    <AtletaRelatorioDocument
      juventusLogoSrc={juventusLogoSrc}
      fotoSrc={fotoUrl}
      nome={atleta.nome_completo}
      subtitulo={subtitulo}
      periodoTexto={periodoTexto}
      stats={stats}
      duracaoReferencia={duracaoReferencia}
      dadosPessoais={dadosPessoais}
      detalhePorCompeticao={detalhePorCompeticao}
    />,
  );

  const nomeArquivo = `relatorio-${atleta.nome_completo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
