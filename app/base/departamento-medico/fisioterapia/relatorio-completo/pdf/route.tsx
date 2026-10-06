export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { getCategoriasBasePermitidas } from "@/lib/auth/role";
import { diasAfastados, fisioterapiaTipoLabel } from "@/lib/futebol/fisioterapia";
import { hojeBrasilia } from "@/lib/data-brasil";
import { FisioterapiaRelatorioCompletoDocument } from "@/lib/pdf/fisioterapia-relatorio-completo-document";
import type { AtletaBaseRow, FisioterapiaAtendimentoBaseRow, FisioterapiaLesaoBaseRow, FisioterapiaQueixaBaseRow } from "@/lib/supabase/types";

/** Rota do PDF do Relatório Completo de Fisioterapia (Futebol de Base) — espelha
 * `app/departamento-medico/fisioterapia/relatorio-completo/pdf/route.tsx` (Profissional):
 * todos os atletas ativos (restritos às categorias que o usuário pode ver), em ordem alfabética,
 * um por página, reaproveitando `FisioterapiaRelatorioCompletoDocument`. */
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
  const categoriasPermitidas = await getCategoriasBasePermitidas(supabase);

  const { data: atletasData } = await supabase
    .from("atletas_base")
    .select("*")
    .eq("ativo", true)
    .in("categoria", categoriasPermitidas)
    .order("nome_completo", { ascending: true });
  const atletas = (atletasData ?? []) as AtletaBaseRow[];
  const atletaIds = atletas.map((a) => a.id);

  const [{ data: lesoesData }, { data: queixasData }, { data: atendimentosData }] = await Promise.all([
    supabase
      .from("fisioterapia_lesoes_base")
      .select("*")
      .in("atleta_id", atletaIds)
      .order("data_inicio", { ascending: false }),
    supabase.from("fisioterapia_queixas_base").select("*").in("atleta_id", atletaIds).order("data", { ascending: false }),
    supabase
      .from("fisioterapia_atendimentos_base")
      .select("*")
      .in("atleta_id", atletaIds)
      .order("data", { ascending: false }),
  ]);

  const lesoes = (lesoesData ?? []) as FisioterapiaLesaoBaseRow[];
  const queixas = (queixasData ?? []) as FisioterapiaQueixaBaseRow[];
  const atendimentos = (atendimentosData ?? []) as FisioterapiaAtendimentoBaseRow[];
  const lesaoPorId = new Map(lesoes.map((l) => [l.id, l]));
  const hojeStr = hojeBrasilia();

  const lesoesPorAtleta = agrupar(lesoes);
  const queixasPorAtleta = agrupar(queixas);
  const atendimentosPorAtleta = agrupar(atendimentos);

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
    historico: [],
    lesoes: (lesoesPorAtleta.get(atleta.id) ?? []).map((l) => ({
      dataInicio: l.data_inicio,
      dataFim: l.data_fim,
      diasAfastados: diasAfastados(l.data_inicio, l.data_fim, hojeStr),
      descricao: l.descricao,
      tipo: fisioterapiaTipoLabel(l.tipo),
      observacoes: l.observacoes,
    })),
    queixas: (queixasPorAtleta.get(atleta.id) ?? []).map((q) => ({
      data: q.data,
      tipo: fisioterapiaTipoLabel(q.tipo),
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
      "Content-Disposition": `inline; filename="fisioterapia-base-relatorio-completo.pdf"`,
    },
  });
}
