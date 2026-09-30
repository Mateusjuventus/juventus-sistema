export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { diasAfastados, fisioterapiaTipoLabel } from "@/lib/futebol/fisioterapia";
import { hojeBrasilia } from "@/lib/data-brasil";
import { FisioterapiaAtletaDocument } from "@/lib/pdf/fisioterapia-atleta-document";
import type {
  AtletaRow,
  FisioterapiaAtendimentoRow,
  FisioterapiaHistoricoImportadoRow,
  FisioterapiaLesaoRow,
  FisioterapiaQueixaRow,
} from "@/lib/supabase/types";

/** Rota do PDF individual de Fisioterapia — mesmo molde de `.../dispensa/pdf/route.tsx`: busca os
 * dados, monta o buffer, devolve `application/pdf`. Nenhum arquivo é guardado — o PDF é sempre
 * montado na hora com os dados salvos (ver docs/superpowers/specs/2026-09-30-fisioterapia-
 * design.md, seção 4). */
export async function GET(_request: Request, { params }: { params: { atletaId: string } }) {
  const supabase = createClient();
  const { data: atletaData } = await supabase.from("atletas").select("*").eq("id", params.atletaId).maybeSingle();
  if (!atletaData) return new NextResponse("Atleta não encontrado.", { status: 404 });
  const atleta = atletaData as AtletaRow;

  const [{ data: lesoesData }, { data: queixasData }, { data: atendimentosData }, { data: historicoData }] =
    await Promise.all([
      supabase
        .from("fisioterapia_lesoes")
        .select("*")
        .eq("atleta_id", atleta.id)
        .order("data_inicio", { ascending: false }),
      supabase.from("fisioterapia_queixas").select("*").eq("atleta_id", atleta.id).order("data", { ascending: false }),
      supabase
        .from("fisioterapia_atendimentos")
        .select("*")
        .eq("atleta_id", atleta.id)
        .order("data", { ascending: false }),
      supabase
        .from("fisioterapia_historico_importado")
        .select("*")
        .eq("atleta_id", atleta.id)
        .order("created_at", { ascending: true }),
    ]);

  const lesoes = (lesoesData ?? []) as FisioterapiaLesaoRow[];
  const queixas = (queixasData ?? []) as FisioterapiaQueixaRow[];
  const atendimentos = (atendimentosData ?? []) as FisioterapiaAtendimentoRow[];
  const historico = (historicoData ?? []) as FisioterapiaHistoricoImportadoRow[];
  const lesaoPorId = new Map(lesoes.map((l) => [l.id, l]));
  const hojeStr = hojeBrasilia();

  const fotoUrl = await getSignedPhotoUrl(supabase, atleta.foto_path);
  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <FisioterapiaAtletaDocument
      juventusLogoSrc={juventusLogoSrc}
      fotoSrc={fotoUrl}
      atleta={{
        nome: atleta.nome_completo,
        apelido: atleta.apelido,
        dataNascimento: atleta.data_nascimento,
        posicao: atleta.posicao,
      }}
      historico={historico.map((h) => ({ titulo: h.titulo, resumo: h.resumo }))}
      lesoes={lesoes.map((l) => ({
        dataInicio: l.data_inicio,
        dataFim: l.data_fim,
        diasAfastados: diasAfastados(l.data_inicio, l.data_fim, hojeStr),
        descricao: l.descricao,
        tipo: fisioterapiaTipoLabel(l.tipo),
        observacoes: l.observacoes,
      }))}
      queixas={queixas.map((q) => ({ data: q.data, tipo: fisioterapiaTipoLabel(q.tipo), descricao: q.descricao }))}
      atendimentos={atendimentos.map((a) => ({
        data: a.data,
        descricao: a.descricao,
        lesaoDescricao: a.lesao_id ? (lesaoPorId.get(a.lesao_id)?.descricao ?? null) : null,
      }))}
      emitidoEm={new Date()}
    />,
  );

  const nomeArquivo = `fisioterapia-${atleta.nome_completo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
