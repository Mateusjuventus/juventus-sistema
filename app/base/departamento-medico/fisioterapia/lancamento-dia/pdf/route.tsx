export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCategoriasBasePermitidas } from "@/lib/auth/role";
import { hojeBrasilia } from "@/lib/data-brasil";
import { nomeExibido } from "@/lib/futebol/nome-atleta";
import { CATEGORIAS_BASE, categoriaBaseLabel, type CategoriaBase } from "@/lib/auth/categorias-base";
import { FisioterapiaRelatorioDiaDocument, type FisioterapiaRelatorioDiaItem } from "@/lib/pdf/fisioterapia-relatorio-dia-document";
import type { AtletaBaseRow, FisioterapiaAtendimentoBaseRow } from "@/lib/supabase/types";

/** Rota do PDF do Relatório Diário (Base) — espelha a rota do Profissional, com agrupamento por
 * categoria (ordem de `CATEGORIAS_BASE`) e restrito às categorias que o usuário logado pode ver
 * (mesmo critério já aplicado na listagem e na tela "Lançamento do dia"). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data")?.trim() || hojeBrasilia();

  const supabase = createClient();
  const categoriasPermitidas = await getCategoriasBasePermitidas(supabase);

  const { data: atendimentosData } = await supabase.from("fisioterapia_atendimentos_base").select("*").eq("data", data);
  const atendimentos = (atendimentosData ?? []) as FisioterapiaAtendimentoBaseRow[];

  const atletaIds = atendimentos.map((a) => a.atleta_id);
  const { data: atletasData } =
    atletaIds.length > 0
      ? await supabase
          .from("atletas_base")
          .select("id, nome_completo, apelido, categoria")
          .in("id", atletaIds)
          .in("categoria", categoriasPermitidas)
      : { data: [] };
  const atletas = (atletasData ?? []) as Pick<AtletaBaseRow, "id" | "nome_completo" | "apelido" | "categoria">[];
  const atletaPorId = new Map(atletas.map((a) => [a.id, a]));

  const ordemCategoria = new Map<CategoriaBase, number>(CATEGORIAS_BASE.map((c, i) => [c.value, i]));

  const itens: FisioterapiaRelatorioDiaItem[] = atendimentos
    .map((a) => {
      const atleta = atletaPorId.get(a.atleta_id);
      // Atleta não encontrado (excluído) ou fora das categorias permitidas pra quem gerou o PDF —
      // mesmo critério de "não revela o que está fora do escopo" já usado nos guards de categoria.
      if (!atleta) return null;
      return {
        nome: nomeExibido({ apelido: atleta.apelido, nome_completo: atleta.nome_completo }),
        categoria: categoriaBaseLabel(atleta.categoria),
        categoriaOrdem: ordemCategoria.get(atleta.categoria) ?? CATEGORIAS_BASE.length,
        statusDia: a.status_dia,
        descricao: a.descricao,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.categoriaOrdem - b.categoriaOrdem || a.nome.localeCompare(b.nome, "pt-BR"))
    .map(({ categoriaOrdem, ...resto }) => resto);

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <FisioterapiaRelatorioDiaDocument
      juventusLogoSrc={juventusLogoSrc}
      departamentoLabel="Futebol de Base"
      data={data}
      itens={itens}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-dia-fisioterapia-base-${data}.pdf"`,
    },
  });
}
