export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { hojeBrasilia } from "@/lib/data-brasil";
import { nomeExibido } from "@/lib/futebol/nome-atleta";
import { FisioterapiaRelatorioDiaDocument, type FisioterapiaRelatorioDiaItem } from "@/lib/pdf/fisioterapia-relatorio-dia-document";
import type { AtletaRow, FisioterapiaAtendimentoRow } from "@/lib/supabase/types";

/** Rota do PDF do Relatório Diário (Profissional) — ver docs/superpowers/specs/2026-10-07-relatorio-
 * dia-fisioterapia-design.md, seção 3. Sem `categoria` nos itens (o Profissional não agrupa — ver
 * `FisioterapiaRelatorioDiaDocument`), lista única em ordem alfabética. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data")?.trim() || hojeBrasilia();

  const supabase = createClient();

  const { data: atendimentosData } = await supabase.from("fisioterapia_atendimentos").select("*").eq("data", data);
  const atendimentos = (atendimentosData ?? []) as FisioterapiaAtendimentoRow[];

  const atletaIds = atendimentos.map((a) => a.atleta_id);
  const { data: atletasData } =
    atletaIds.length > 0
      ? await supabase.from("atletas").select("id, nome_completo, apelido").in("id", atletaIds)
      : { data: [] };
  const atletas = (atletasData ?? []) as Pick<AtletaRow, "id" | "nome_completo" | "apelido">[];
  const nomePorId = new Map(atletas.map((a) => [a.id, nomeExibido({ apelido: a.apelido, nome_completo: a.nome_completo })]));

  const itens: FisioterapiaRelatorioDiaItem[] = atendimentos
    .map((a) => ({
      nome: nomePorId.get(a.atleta_id) ?? "—",
      statusDia: a.status_dia,
      descricao: a.descricao,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <FisioterapiaRelatorioDiaDocument
      juventusLogoSrc={juventusLogoSrc}
      departamentoLabel="Futebol Profissional"
      data={data}
      itens={itens}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-dia-fisioterapia-${data}.pdf"`,
    },
  });
}
