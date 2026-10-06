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
import type { AtletaBaseRow, FisioterapiaAtendimentoBaseRow, FisioterapiaLesaoBaseRow, FisioterapiaQueixaBaseRow } from "@/lib/supabase/types";

/** Rota do PDF individual de Fisioterapia (Futebol de Base) — espelha `app/departamento-medico/
 * fisioterapia/[atletaId]/pdf/route.tsx` (Profissional), reaproveitando o mesmo
 * `FisioterapiaAtletaDocument` (genérico, recebe os dados já montados). Sem `historico` (a Base não
 * tem histórico importado). Ver docs/superpowers/specs/2026-10-06-fisioterapia-base-design.md. */
export async function GET(_request: Request, { params }: { params: { atletaId: string } }) {
  const supabase = createClient();
  const { data: atletaData } = await supabase.from("atletas_base").select("*").eq("id", params.atletaId).maybeSingle();
  if (!atletaData) return new NextResponse("Atleta não encontrado.", { status: 404 });
  const atleta = atletaData as AtletaBaseRow;

  const [{ data: lesoesData }, { data: queixasData }, { data: atendimentosData }] = await Promise.all([
    supabase
      .from("fisioterapia_lesoes_base")
      .select("*")
      .eq("atleta_id", atleta.id)
      .order("data_inicio", { ascending: false }),
    supabase.from("fisioterapia_queixas_base").select("*").eq("atleta_id", atleta.id).order("data", { ascending: false }),
    supabase
      .from("fisioterapia_atendimentos_base")
      .select("*")
      .eq("atleta_id", atleta.id)
      .order("data", { ascending: false }),
  ]);

  const lesoes = (lesoesData ?? []) as FisioterapiaLesaoBaseRow[];
  const queixas = (queixasData ?? []) as FisioterapiaQueixaBaseRow[];
  const atendimentos = (atendimentosData ?? []) as FisioterapiaAtendimentoBaseRow[];
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
      historico={[]}
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
