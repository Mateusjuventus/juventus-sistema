export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { diasAfastados, queixaTipoLabel } from "@/lib/futebol/fisioterapia";
import { hojeBrasilia } from "@/lib/data-brasil";
import { FisioterapiaRelatorioCompletoDocument } from "@/lib/pdf/fisioterapia-relatorio-completo-document";
import type {
  AtletaRow,
  FisioterapiaAtendimentoRow,
  FisioterapiaHistoricoImportadoRow,
  FisioterapiaLesaoRow,
  FisioterapiaQueixaRow,
} from "@/lib/supabase/types";

/** Rota do PDF do Relatório Completo de Fisioterapia — todos os atletas ativos, em ordem
 * alfabética (mesma ordem da listagem), um por página, um documento só (em vez de baixar um PDF por
 * atleta). Mesmo conteúdo do relatório individual (`[atletaId]/pdf/route.tsx`, via
 * `FisioterapiaAtletaConteudo` compartilhado), só que busca os dados de todo mundo de uma vez — uma
 * query por tabela, agrupada em memória — em vez de repetir a busca atleta por atleta. */
function agrupar<T extends { atleta_id: string }>(rows: T[]): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const row of rows) {
    const lista = mapa.get(row.atleta_id) ?? [];
    lista.push(row);
    mapa.set(row.atleta_id, lista);
  }
  return mapa;
}

export async function GET() {
  const supabase = createClient();

  const { data: atletasData } = await supabase
    .from("atletas")
    .select("*")
    .eq("ativo", true)
    .order("nome_completo", { ascending: true });
  const atletas = (atletasData ?? []) as AtletaRow[];
  const atletaIds = atletas.map((a) => a.id);

  const [{ data: lesoesData }, { data: queixasData }, { data: atendimentosData }, { data: historicoData }] =
    await Promise.all([
      supabase
        .from("fisioterapia_lesoes")
        .select("*")
        .in("atleta_id", atletaIds)
        .order("data_inicio", { ascending: false }),
      supabase.from("fisioterapia_queixas").select("*").in("atleta_id", atletaIds).order("data", { ascending: false }),
      supabase
        .from("fisioterapia_atendimentos")
        .select("*")
        .in("atleta_id", atletaIds)
        .order("data", { ascending: false }),
      supabase
        .from("fisioterapia_historico_importado")
        .select("*")
        .in("atleta_id", atletaIds)
        .order("created_at", { ascending: true }),
    ]);

  const lesoes = (lesoesData ?? []) as FisioterapiaLesaoRow[];
  const queixas = (queixasData ?? []) as FisioterapiaQueixaRow[];
  const atendimentos = (atendimentosData ?? []) as FisioterapiaAtendimentoRow[];
  const historico = (historicoData ?? []) as FisioterapiaHistoricoImportadoRow[];
  const lesaoPorId = new Map(lesoes.map((l) => [l.id, l]));
  const hojeStr = hojeBrasilia();

  const lesoesPorAtleta = agrupar(lesoes);
  const queixasPorAtleta = agrupar(queixas);
  const atendimentosPorAtleta = agrupar(atendimentos);
  const historicoPorAtleta = agrupar(
    historico.filter((h): h is FisioterapiaHistoricoImportadoRow & { atleta_id: string } => h.atleta_id !== null),
  );

  const fotoUrls = await Promise.all(atletas.map((a) => getSignedPhotoUrl(supabase, a.foto_path)));
  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const itens = atletas.map((atleta, i) => ({
    id: atleta.id,
    fotoSrc: fotoUrls[i],
    atleta: {
      nome: atleta.nome_completo,
      apelido: atleta.apelido,
      dataNascimento: atleta.data_nascimento,
      posicao: atleta.posicao,
    },
    historico: (historicoPorAtleta.get(atleta.id) ?? []).map((h) => ({ titulo: h.titulo, resumo: h.resumo })),
    lesoes: (lesoesPorAtleta.get(atleta.id) ?? []).map((l) => ({
      dataInicio: l.data_inicio,
      dataFim: l.data_fim,
      diasAfastados: diasAfastados(l.data_inicio, l.data_fim, hojeStr),
      descricao: l.descricao,
      observacoes: l.observacoes,
    })),
    queixas: (queixasPorAtleta.get(atleta.id) ?? []).map((q) => ({
      data: q.data,
      tipo: queixaTipoLabel(q.tipo),
      descricao: q.descricao,
    })),
    atendimentos: (atendimentosPorAtleta.get(atleta.id) ?? []).map((a) => ({
      data: a.data,
      descricao: a.descricao,
      lesaoDescricao: a.lesao_id ? (lesaoPorId.get(a.lesao_id)?.descricao ?? null) : null,
    })),
  }));

  const buffer = await renderToBuffer(
    <FisioterapiaRelatorioCompletoDocument juventusLogoSrc={juventusLogoSrc} atletas={itens} emitidoEm={new Date()} />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="fisioterapia-relatorio-completo.pdf"`,
    },
  });
}
