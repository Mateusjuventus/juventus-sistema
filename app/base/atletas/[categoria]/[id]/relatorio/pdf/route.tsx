export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { buscarEstatisticasAtleta } from "@/lib/futebol/estatisticas-atleta-query";
import { AtletaRelatorioDocument } from "@/lib/pdf/atleta-relatorio-document";
import { formatDataBr } from "@/lib/pdf/logistica-shared";
import { ATLETA_BASE_TIPO_CONTRATO_OPTIONS } from "@/lib/validation/schemas";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import type { AtletaBaseRow } from "@/lib/supabase/types";

const TABELAS = {
  jogos: "jogos_base",
  convocacoes: "convocacoes_base",
  convocacaoAtletas: "convocacao_atletas_base",
  sumulas: "sumulas_base",
  sumulaEventos: "sumula_eventos_base",
};

function naturalidade(cidade: string | null, uf: string | null): string | null {
  if (cidade && uf) return `${cidade}/${uf}`;
  return cidade || uf || null;
}

/** Espelha `app/atletas/[id]/relatorio/pdf/route.tsx` para o Futebol de Base. */
export async function GET(request: Request, { params }: { params: { categoria: string; id: string } }) {
  const url = new URL(request.url);
  const de = url.searchParams.get("de") || undefined;
  const ate = url.searchParams.get("ate") || undefined;
  const competicao = url.searchParams.get("competicao") || undefined;
  const incluirDadosPessoais = url.searchParams.get("incluirDadosPessoais") === "sim";

  const supabase = createClient();
  const { data: atletaData } = await supabase.from("atletas_base").select("*").eq("id", params.id).single();
  if (!atletaData) return new NextResponse("Atleta não encontrado.", { status: 404 });

  const atleta = atletaData as AtletaBaseRow;
  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);
  const subtitulo = `${categoriaBaseLabel(atleta.categoria)} · ${atleta.posicao}${atleta.numero_camisa ? ` · Nº ${atleta.numero_camisa}` : ""}`;

  const { stats } = await buscarEstatisticasAtleta(supabase, atleta.id, TABELAS, { de, ate, competicao });

  const periodoPartes = [
    de || ate ? `Período: ${de ? formatDataBr(de) : "início"} até ${ate ? formatDataBr(ate) : "hoje"}` : "Histórico completo",
    competicao || null,
  ].filter(Boolean);
  const periodoTexto = periodoPartes.join(" · ");

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const dadosPessoais = incluirDadosPessoais
    ? {
        rg: atleta.rg ?? "",
        cpf: atleta.cpf ?? "",
        dataNascimento: atleta.data_nascimento,
        telefone: atleta.telefone,
        naturalidade: naturalidade(atleta.cidade_natal, atleta.uf_natal),
        tipoContrato: atleta.tipo_contrato
          ? ATLETA_BASE_TIPO_CONTRATO_OPTIONS.find((o) => o.value === atleta.tipo_contrato)?.label ??
            atleta.tipo_contrato
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
      dadosPessoais={dadosPessoais}
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
