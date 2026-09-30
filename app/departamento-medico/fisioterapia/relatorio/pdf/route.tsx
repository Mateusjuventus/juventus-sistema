export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { hojeBrasilia } from "@/lib/data-brasil";
import { montarResumoGeralFisioterapia } from "@/lib/futebol/fisioterapia";
import { nomeExibido } from "@/lib/futebol/nome-atleta";
import { FisioterapiaRelatorioGeralDocument } from "@/lib/pdf/fisioterapia-relatorio-geral-document";
import type {
  AtletaRow,
  FisioterapiaAtendimentoRow,
  FisioterapiaHistoricoImportadoRow,
  FisioterapiaLesaoRow,
  FisioterapiaQueixaRow,
} from "@/lib/supabase/types";

/** Rota do PDF do Relatório Geral (consolidado) de Fisioterapia — mesma agregação da tela
 * (`montarResumoGeralFisioterapia`), sem guardar arquivo (montado na hora). */
export async function GET() {
  const supabase = createClient();

  const [
    { data: atletasData },
    { data: lesoesData },
    { data: queixasData },
    { data: atendimentosData },
    { data: historicoGeralData },
  ] = await Promise.all([
    supabase.from("atletas").select("id, nome_completo, apelido"),
    supabase.from("fisioterapia_lesoes").select("atleta_id, data_inicio, data_fim"),
    supabase.from("fisioterapia_queixas").select("atleta_id, data"),
    supabase.from("fisioterapia_atendimentos").select("atleta_id, quantidade"),
    supabase.from("fisioterapia_historico_importado").select("*").is("atleta_id", null).order("created_at", { ascending: true }),
  ]);

  const historicoGeral = (historicoGeralData ?? []) as FisioterapiaHistoricoImportadoRow[];

  const atletas = (atletasData ?? []) as Pick<AtletaRow, "id" | "nome_completo" | "apelido">[];
  const linhas = montarResumoGeralFisioterapia(
    atletas.map((a) => ({ id: a.id, nome: nomeExibido({ apelido: a.apelido, nome_completo: a.nome_completo }) })),
    (lesoesData ?? []) as Pick<FisioterapiaLesaoRow, "atleta_id" | "data_inicio" | "data_fim">[],
    (queixasData ?? []) as Pick<FisioterapiaQueixaRow, "atleta_id" | "data">[],
    (atendimentosData ?? []) as Pick<FisioterapiaAtendimentoRow, "atleta_id" | "quantidade">[],
    hojeBrasilia(),
  );

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <FisioterapiaRelatorioGeralDocument
      juventusLogoSrc={juventusLogoSrc}
      historicoGeral={historicoGeral.map((h) => ({ titulo: h.titulo, resumo: h.resumo }))}
      linhas={linhas.map((l) => ({
        nome: l.nome,
        emTratamento: l.emTratamento,
        totalDiasAfastados: l.totalDiasAfastados,
        ultimaQueixaData: l.ultimaQueixaData,
        totalAtendimentos: l.totalAtendimentos,
      }))}
      geradoEm={new Date()}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-geral-fisioterapia.pdf"`,
    },
  });
}
