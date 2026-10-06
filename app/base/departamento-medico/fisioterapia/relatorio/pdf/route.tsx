export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasBasePermitidas } from "@/lib/auth/role";
import { hojeBrasilia } from "@/lib/data-brasil";
import { montarResumoGeralFisioterapia } from "@/lib/futebol/fisioterapia";
import { nomeExibido } from "@/lib/futebol/nome-atleta";
import { FisioterapiaRelatorioGeralDocument } from "@/lib/pdf/fisioterapia-relatorio-geral-document";
import type { AtletaBaseRow, FisioterapiaAtendimentoBaseRow, FisioterapiaLesaoBaseRow, FisioterapiaQueixaBaseRow } from "@/lib/supabase/types";

/** Rota do PDF do Relatório Geral (consolidado) de Fisioterapia (Futebol de Base) — espelha
 * `app/departamento-medico/fisioterapia/relatorio/pdf/route.tsx` (Profissional), reaproveitando o
 * mesmo `FisioterapiaRelatorioGeralDocument`. Sem `historicoGeral` (a Base não tem histórico
 * importado). Restrita às categorias que o usuário logado pode ver, igual à tela. */
export async function GET() {
  const supabase = createClient();
  const categoriasPermitidas = await getCategoriasBasePermitidas(supabase);

  const { data: atletasData } = await supabase
    .from("atletas_base")
    .select("id, nome_completo, apelido")
    .in("categoria", categoriasPermitidas);
  const atletas = (atletasData ?? []) as Pick<AtletaBaseRow, "id" | "nome_completo" | "apelido">[];
  const atletaIds = atletas.map((a) => a.id);

  const [{ data: lesoesData }, { data: queixasData }, { data: atendimentosData }] = await Promise.all([
    supabase.from("fisioterapia_lesoes_base").select("atleta_id, data_inicio, data_fim").in("atleta_id", atletaIds),
    supabase.from("fisioterapia_queixas_base").select("atleta_id, data").in("atleta_id", atletaIds),
    supabase.from("fisioterapia_atendimentos_base").select("atleta_id, quantidade").in("atleta_id", atletaIds),
  ]);

  const linhas = montarResumoGeralFisioterapia(
    atletas.map((a) => ({ id: a.id, nome: nomeExibido({ apelido: a.apelido, nome_completo: a.nome_completo }) })),
    (lesoesData ?? []) as Pick<FisioterapiaLesaoBaseRow, "atleta_id" | "data_inicio" | "data_fim">[],
    (queixasData ?? []) as Pick<FisioterapiaQueixaBaseRow, "atleta_id" | "data">[],
    (atendimentosData ?? []) as Pick<FisioterapiaAtendimentoBaseRow, "atleta_id" | "quantidade">[],
    hojeBrasilia(),
  );

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <FisioterapiaRelatorioGeralDocument
      juventusLogoSrc={juventusLogoSrc}
      historicoGeral={[]}
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
      "Content-Disposition": `inline; filename="relatorio-geral-fisioterapia-base.pdf"`,
    },
  });
}
