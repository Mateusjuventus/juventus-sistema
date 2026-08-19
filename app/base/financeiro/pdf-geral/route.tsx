export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getAssinaturasFinanceiroBase } from "@/lib/pdf/assinaturas";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import { calcularGeralBase, valorDespesaBase } from "@/lib/futebol/financeiro-base";
import {
  RelatorioGeralBaseDocument,
  type RelatorioGeralBaseAtleta,
  type RelatorioGeralBaseComissao,
  type RelatorioGeralBaseDespesa,
  type RelatorioGeralBaseFatia,
} from "@/lib/pdf/relatorio-geral-base-document";
import type {
  AtletaBaseRow,
  ComissaoTecnicaBaseRow,
  DespesaAvulsaBaseComCategoriaRow,
} from "@/lib/supabase/types";

/** PDF da aba "Geral da Base" de `/base/financeiro` — totalmente separado do PDF de Prestação de
 * Contas de jogos (`../pdf/route.tsx`), ver docs/superpowers/specs/2026-08-19-financeiro-base-
 * design.md. Mesmo cálculo da tela (`GeralBaseView`), via `lib/futebol/financeiro-base.ts`. */
export async function GET() {
  const supabase = createClient();

  const [{ data: comissaoData }, { data: atletasData }, { data: despesasData }, { assinatura1, assinatura2 }] =
    await Promise.all([
      supabase.from("comissao_tecnica_base").select("*").order("nome_completo", { ascending: true }),
      supabase.from("atletas_base").select("*").order("nome_completo", { ascending: true }),
      supabase
        .from("despesas_avulsas_base")
        .select("*, categoria_gasto:categorias_gasto(nome)")
        .order("data", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
      getAssinaturasFinanceiroBase(supabase),
    ]);

  const comissao = (comissaoData ?? []) as ComissaoTecnicaBaseRow[];
  const atletas = (atletasData ?? []) as AtletaBaseRow[];
  const despesas = (despesasData ?? []) as DespesaAvulsaBaseComCategoriaRow[];
  const atletasComAjuda = atletas.filter((a) => (a.valor_ajuda_custo ?? 0) > 0);

  if (comissao.length === 0 && atletasComAjuda.length === 0 && despesas.length === 0) {
    return new NextResponse("Ainda não há nada cadastrado no Gasto Geral da Base.", { status: 400 });
  }

  const { custoComissao, custoAtletas, custoMensalFixo, despesasTotal, totalGeral, linhasCategoria } =
    calcularGeralBase(comissao, atletasComAjuda, despesas);

  // Mesmas 3 cores e mesma leitura (Comissão / Atletas / Despesas) do gráfico da tela
  // (`geral-base-view.tsx`) — só o desenho em si muda entre os dois (ver comentário em
  // `caminhoFatiaDonut` no documento do PDF).
  const composicaoPdf: RelatorioGeralBaseFatia[] = [
    { label: "Comissão Técnica", valor: custoComissao, cor: "#5C0A35" },
    { label: "Atletas (ajuda de custo)", valor: custoAtletas, cor: "#B98F1E" },
    { label: "Despesas avulsas", valor: despesasTotal, cor: "#a3a3a3" },
  ];

  const comissaoPdf: RelatorioGeralBaseComissao[] = comissao.map((c) => ({
    nome: c.nome_completo,
    funcao: c.funcao,
    categorias: c.categorias.map(categoriaBaseLabel).join(" · "),
    valorSalario: c.valor_salario,
  }));

  const atletasPdf: RelatorioGeralBaseAtleta[] = atletasComAjuda.map((a) => ({
    nome: a.nome_completo,
    categoria: categoriaBaseLabel(a.categoria),
    valorAjudaCusto: a.valor_ajuda_custo ?? 0,
  }));

  const despesasPdf: RelatorioGeralBaseDespesa[] = despesas.map((d) => ({
    categoria: d.categoria ? categoriaBaseLabel(d.categoria) : "Geral",
    tipo: d.categoria_gasto?.nome ?? "—",
    descricao: d.descricao,
    data: d.data,
    valor: valorDespesaBase(d),
    efetuado: d.valor_efetuado !== null,
  }));

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <RelatorioGeralBaseDocument
      juventusLogoSrc={juventusLogoSrc}
      geradoEm={new Date()}
      custoMensalFixo={custoMensalFixo}
      despesasTotal={despesasTotal}
      totalGeral={totalGeral}
      composicao={composicaoPdf}
      categorias={linhasCategoria}
      comissao={comissaoPdf}
      atletas={atletasPdf}
      despesas={despesasPdf}
      assinatura1={assinatura1}
      assinatura2={assinatura2}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="gasto-geral-da-base.pdf"',
    },
  });
}
