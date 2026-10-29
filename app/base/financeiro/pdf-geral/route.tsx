export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getAssinaturasFinanceiroBase } from "@/lib/pdf/assinaturas";
import { CATEGORIAS_BASE, categoriaBaseLabel, ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import { podeVerCampoSensivel } from "@/lib/auth/role";
import {
  calcularGeralBase,
  custoAtletaBase,
  mapaContratoVigentePorAtleta,
  tipoPagamentoAtletaBase,
  valorDespesaBase,
} from "@/lib/futebol/financeiro-base";
import {
  RelatorioGeralBaseDocument,
  type RelatorioGeralBaseAtletasCategoria,
  type RelatorioGeralBaseComissao,
  type RelatorioGeralBaseDespesa,
  type RelatorioGeralBaseFatia,
} from "@/lib/pdf/relatorio-geral-base-document";
import type {
  AtletaContratoRow,
  AtletaRow,
  ComissaoTecnicaRow,
  DespesaAvulsaBaseComCategoriaRow,
} from "@/lib/supabase/types";

/** PDF da aba "Geral da Base" de `/base/financeiro` — totalmente separado do PDF de Prestação de
 * Contas de jogos (`../pdf/route.tsx`), ver docs/superpowers/specs/2026-08-19-financeiro-base-
 * design.md. Mesmo cálculo da tela (`GeralBaseView`), via `lib/futebol/financeiro-base.ts`. */
export async function GET() {
  const supabase = createClient();

  const [
    { data: comissaoData },
    { data: atletasData },
    { data: despesasData },
    { data: contratosData },
    { assinatura1, assinatura2 },
    podeVerSalario,
  ] = await Promise.all([
    supabase.from("comissao_tecnica").select("*").order("nome_completo", { ascending: true }),
    supabase.from("atletas").select("*").order("nome_completo", { ascending: true }),
    supabase
      .from("despesas_avulsas_base")
      .select("*, categoria_gasto:categorias_gasto(nome)")
      .order("data", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.from("atleta_contratos").select("*").eq("vigente", true),
    getAssinaturasFinanceiroBase(supabase),
    podeVerCampoSensivel(supabase, "salario"),
  ]);

  // Comissão Técnica já é unificada (Profissional + Base) — só entra quem tem pelo menos uma
  // categoria da Base (ver mesmo filtro em `geral-base-view.tsx`).
  const comissao = ((comissaoData ?? []) as ComissaoTecnicaRow[]).filter((c) =>
    c.categorias.some(ehCategoriaBaseValida),
  );
  // Mesmo filtro de `geral-base-view.tsx`: `atletas`/`atleta_contratos` são compartilhadas com o
  // Profissional desde a unificação de Atletas (28/10/2026) — só entra quem tem `categoria` da
  // Base, e os contratos vigentes são filtrados pro mesmo conjunto de atletas (por `atleta_id`).
  const atletas = ((atletasData ?? []) as AtletaRow[]).filter((a) => a.categoria !== "profissional");
  const atletaIdsBase = new Set(atletas.map((a) => a.id));
  const despesas = (despesasData ?? []) as DespesaAvulsaBaseComCategoriaRow[];
  const contratosVigentes = ((contratosData ?? []) as AtletaContratoRow[]).filter((c) =>
    atletaIdsBase.has(c.atleta_id),
  );
  const contratoPorAtleta = mapaContratoVigentePorAtleta(contratosVigentes);

  if (comissao.length === 0 && atletas.length === 0 && despesas.length === 0) {
    return new NextResponse("Ainda não há nada cadastrado no Gasto Geral da Base.", { status: 400 });
  }

  const { custoComissao, custoAtletas, custoMensalFixo, despesasTotal, totalGeral, linhasCategoria } =
    calcularGeralBase(comissao, atletas, despesas, contratosVigentes);

  // Mesmas 3 cores e mesma leitura (Comissão / Atletas / Despesas) do gráfico da tela
  // (`geral-base-view.tsx`) — só o desenho em si muda entre os dois (ver comentário em
  // `caminhoFatiaDonut` no documento do PDF).
  const composicaoPdf: RelatorioGeralBaseFatia[] = [
    { label: "Comissão Técnica", valor: custoComissao, cor: "#5C0A35" },
    { label: "Atletas", valor: custoAtletas, cor: "#B98F1E" },
    { label: "Despesas avulsas", valor: despesasTotal, cor: "#a3a3a3" },
  ];

  const comissaoPdf: RelatorioGeralBaseComissao[] = comissao.map((c) => ({
    nome: c.nome_completo,
    funcao: c.funcao,
    categorias: c.categorias.filter(ehCategoriaBaseValida).map(categoriaBaseLabel).join(" · "),
    valorSalario: c.valor_salario,
  }));

  // Todo atleta cadastrado, agrupado por categoria — espelha a mesma listagem da tela
  // (`geral-base-view.tsx`), com o tipo de pagamento vindo do tipo de contrato de cada um.
  const atletasPorCategoria: RelatorioGeralBaseAtletasCategoria[] = CATEGORIAS_BASE.map((cat) => {
    const doGrupo = atletas.filter((a) => a.categoria === cat.value);
    return {
      categoriaLabel: cat.label,
      subtotal: doGrupo.reduce((soma, a) => soma + custoAtletaBase(a, contratoPorAtleta), 0),
      atletas: doGrupo.map((a) => ({
        nome: a.nome_completo,
        tipoPagamento: tipoPagamentoAtletaBase(a.tipo_contrato),
        valor: custoAtletaBase(a, contratoPorAtleta) || null,
      })),
    };
  });

  const despesasPdf: RelatorioGeralBaseDespesa[] = despesas.map((d) => ({
    categoria: d.categoria ? categoriaBaseLabel(d.categoria) : "Geral",
    tipo: d.categoria_gasto?.nome ?? "—",
    descricao: d.descricao,
    data: d.data,
    valor: valorDespesaBase(d),
    efetuado: d.valor_efetuado !== null,
  }));

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo.png");
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
      atletasPorCategoria={atletasPorCategoria}
      despesas={despesasPdf}
      assinatura1={assinatura1}
      assinatura2={assinatura2}
      podeVerSalario={podeVerSalario}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="gasto-geral-da-base.pdf"',
    },
  });
}
