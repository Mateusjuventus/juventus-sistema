export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import {
  RelatorioDespesasDocument,
  type FaseGasto,
  type RelatorioDespesasPdfCategoria,
  type RelatorioDespesasPdfFase,
} from "@/lib/pdf/relatorio-despesas-document";

const ORDEM_FASES: FaseGasto[] = ["pre_jogo", "pos_jogo", null];
import { getAssinaturasFinanceiro, montarAssinaturasFinanceiroComDigital } from "@/lib/pdf/assinaturas";
import { buscarAssinaturas, resolverImagensAssinaturas } from "@/lib/assinaturas/actions";
import type { GastoJogoComCategoriaRow, JogoRow } from "@/lib/supabase/types";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: jogoData } = await supabase.from("jogos").select("*").eq("id", params.id).single();
  if (!jogoData) return new NextResponse("Jogo não encontrado.", { status: 404 });
  const jogo = jogoData as JogoRow;

  const [{ data: gastosData }, adversarioLogoUrl, assinaturasConfig, assinaturasSalvas] = await Promise.all([
    supabase
      .from("gastos_jogo")
      .select("*, categoria:categorias_gasto(nome)")
      .eq("jogo_id", params.id)
      .order("created_at", { ascending: true }),
    getSignedPhotoUrl(supabase, jogo.adversario_logo_path),
    getAssinaturasFinanceiro(supabase),
    buscarAssinaturas("despesas_jogo", jogo.id),
  ]);
  const assinaturasComImagem = await resolverImagensAssinaturas(supabase, assinaturasSalvas);
  const { assinatura1, assinatura2 } = montarAssinaturasFinanceiroComDigital(assinaturasConfig, assinaturasComImagem);
  const gastos = ((gastosData ?? []) as GastoJogoComCategoriaRow[]).filter(
    (g) => g.valor_efetuado !== null,
  );

  if (gastos.length === 0) {
    return new NextResponse("Ainda não há despesas efetuadas lançadas para este jogo.", { status: 400 });
  }

  const porFase = new Map<FaseGasto, Map<string, RelatorioDespesasPdfCategoria>>();
  for (const g of gastos) {
    const fase = (g.fase as FaseGasto) ?? null;
    const categoriasMap = porFase.get(fase) ?? new Map<string, RelatorioDespesasPdfCategoria>();
    const nomeCategoria = g.categoria?.nome ?? "Outros";
    const grupo = categoriasMap.get(nomeCategoria) ?? { nome: nomeCategoria, gastos: [] };
    grupo.gastos.push({ data: g.data, descricao: g.descricao, valorEfetuado: g.valor_efetuado as number });
    categoriasMap.set(nomeCategoria, grupo);
    porFase.set(fase, categoriasMap);
  }
  const fases: RelatorioDespesasPdfFase[] = ORDEM_FASES.filter((fase) => porFase.has(fase)).map((fase) => ({
    fase,
    categorias: Array.from(porFase.get(fase)!.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
  }));
  const totalGeral = gastos.reduce((soma, g) => soma + (g.valor_efetuado as number), 0);

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <RelatorioDespesasDocument
      jogo={jogo}
      juventusLogoSrc={juventusLogoSrc}
      adversarioLogoSrc={adversarioLogoUrl}
      fases={fases}
      totalGeral={totalGeral}
      geradoEm={new Date()}
      assinatura1={assinatura1}
      assinatura2={assinatura2}
      departamento="profissional"
    />,
  );

  const nomeArquivo = `relatorio-despesas-juventus-x-${jogo.adversario_nome
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-${jogo.data_jogo}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}"`,
    },
  });
}
