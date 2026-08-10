export const runtime = "nodejs";

import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getAssinaturasFinanceiro } from "@/lib/pdf/assinaturas";
import {
  DespesasAvulsasOrcamentoDocument,
  type DespesaAvulsaOrcamentoPdfCategoria,
  type DespesaAvulsaOrcamentoPdfItem,
} from "@/lib/pdf/despesas-avulsas-orcamento-document";
import type { DespesaAvulsaComCategoriaRow, JogoRow } from "@/lib/supabase/types";

function confrontoResumo(jogo: JogoRow): string {
  const nome = jogo.mandante ? `Juventus x ${jogo.adversario_nome}` : `${jogo.adversario_nome} x Juventus`;
  const [ano, mes, dia] = jogo.data_jogo.split("-");
  return `${nome} (${dia}/${mes})`;
}

/** O subtítulo do PDF é escolhido na hora de gerar (ver formulário em
 * /financeiro/despesas-avulsas): o jogo marcado no seletor (se houver, busca os dados dele e monta
 * confronto + competição + data) ou, se nenhum jogo foi escolhido, o título livre digitado — em
 * branco se nenhum dos dois vier preenchido. Substitui o texto fixo "Despesas avulsas — não
 * ligadas a um jogo específico" que existia antes (o Mateus já sabe disso, pediu pra tirar). */
async function resolverSubtitulo(
  supabase: ReturnType<typeof createClient>,
  searchParams: URLSearchParams,
): Promise<string> {
  const jogoId = searchParams.get("jogoId");
  if (jogoId) {
    const { data } = await supabase.from("jogos").select("*").eq("id", jogoId).maybeSingle();
    if (data) {
      const jogo = data as JogoRow;
      const confronto = jogo.mandante ? `Juventus x ${jogo.adversario_nome}` : `${jogo.adversario_nome} x Juventus`;
      const [ano, mes, dia] = jogo.data_jogo.split("-");
      return `${confronto} · ${jogo.competicao} · ${dia}/${mes}/${ano}`;
    }
  }
  return searchParams.get("titulo")?.trim() || "";
}

/** PDF "Orçamento Previsto — Despesas Avulsas" (só previsto) — mesmo espírito do PDF de orçamento
 * de cada jogo (`/jogos/[id]/financeiro/pdf`). O PDF de efetuado fica em
 * `/financeiro/despesas-avulsas/despesas/pdf`, mesmo padrão de 2 PDFs separados já usado por
 * jogo (ver docs/superpowers/specs/2026-08-08-despesas-avulsas-design.md). */
export async function GET(request: Request) {
  const supabase = createClient();
  const searchParams = new URL(request.url).searchParams;
  const jogoIdFiltro = searchParams.get("jogoId");

  const [{ data: despesasData }, { data: vinculosData }, { assinatura1, assinatura2 }, subtitulo] =
    await Promise.all([
      supabase.from("despesas_avulsas").select("*, categoria:categorias_gasto(nome)"),
      supabase
        .from("despesas_avulsas_jogos")
        .select("despesa_id, jogo:jogos(id, mandante, adversario_nome, data_jogo)"),
      getAssinaturasFinanceiro(supabase),
      resolverSubtitulo(supabase, searchParams),
    ]);

  const jogosPorDespesa = new Map<string, JogoRow[]>();
  for (const v of (vinculosData ?? []) as unknown as { despesa_id: string; jogo: JogoRow | null }[]) {
    if (!v.jogo) continue;
    const lista = jogosPorDespesa.get(v.despesa_id) ?? [];
    lista.push(v.jogo);
    jogosPorDespesa.set(v.despesa_id, lista);
  }

  // Quando um jogo é escolhido no formulário, o relatório mostra só as despesas vinculadas a ele —
  // é assim que dá pra "separar" um grupo de despesas depois, em vez de sempre trazer tudo junto.
  let despesas = (despesasData ?? []) as DespesaAvulsaComCategoriaRow[];
  if (jogoIdFiltro) {
    despesas = despesas.filter((d) =>
      (jogosPorDespesa.get(d.id) ?? []).some((j) => j.id === jogoIdFiltro),
    );
  }

  if (despesas.length === 0) {
    return new NextResponse(
      jogoIdFiltro
        ? "Nenhuma despesa avulsa vinculada a esse jogo."
        : "Ainda não há despesas avulsas lançadas.",
      { status: 400 },
    );
  }

  const totalGeral = despesas.reduce((soma, d) => soma + d.valor_previsto, 0);

  const porCategoria = new Map<string, DespesaAvulsaOrcamentoPdfItem[]>();
  for (const d of despesas) {
    const nome = d.categoria?.nome ?? "Outros";
    const lista = porCategoria.get(nome) ?? [];
    lista.push({ data: d.data, descricao: d.descricao, valorPrevisto: d.valor_previsto });
    porCategoria.set(nome, lista);
  }

  // Informação do documento como um todo — todos os jogos relacionados às despesas incluídas
  // neste relatório, sem repetir por linha (ver DespesasAvulsasOrcamentoDocument).
  const jogosIncluidosMap = new Map<string, string>();
  for (const d of despesas) {
    for (const j of jogosPorDespesa.get(d.id) ?? []) {
      jogosIncluidosMap.set(j.id, confrontoResumo(j));
    }
  }
  const jogosIncluidos = Array.from(jogosIncluidosMap.values());
  const categorias: DespesaAvulsaOrcamentoPdfCategoria[] = Array.from(porCategoria.entries())
    .map(([nome, despesasDaCategoria]) => ({ nome, despesas: despesasDaCategoria }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const juventusLogoPath = path.join(process.cwd(), "public/brand/juventus-escudo-mark.png");
  const juventusLogoSrc = { data: readFileSync(juventusLogoPath), format: "png" as const };

  const buffer = await renderToBuffer(
    <DespesasAvulsasOrcamentoDocument
      juventusLogoSrc={juventusLogoSrc}
      geradoEm={new Date()}
      categorias={categorias}
      totalGeral={totalGeral}
      assinatura1={assinatura1}
      assinatura2={assinatura2}
      departamento="profissional"
      subtitulo={subtitulo}
      jogosRelacionados={jogosIncluidos}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="orcamento-previsto-despesas-avulsas.pdf"',
    },
  });
}
