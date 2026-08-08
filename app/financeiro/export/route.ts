import { createClient } from "@/lib/supabase/server";
import { buildXlsxResponse } from "@/lib/xlsx-export";
import type { DespesaAvulsaComCategoriaRow, GastoJogoComCategoriaRow, JogoRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

function formatData(data: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Exporta o painel de Prestação de Contas para Excel, com uma aba "Por Categoria" (soma gastos de
 * jogo + despesas avulsas), "Por Jogo" e "Despesas Avulsas" — mesmo agrupamento mostrado na
 * tela. */
export async function GET() {
  const supabase = createClient();

  const [{ data: jogosData }, { data: gastosData }, { data: despesasAvulsasData }] = await Promise.all([
    supabase.from("jogos").select("*").order("data_jogo", { ascending: false }),
    supabase.from("gastos_jogo").select("*, categoria:categorias_gasto(nome)"),
    supabase
      .from("despesas_avulsas")
      .select("*, categoria:categorias_gasto(nome)")
      .order("data", { ascending: false, nullsFirst: false }),
  ]);

  const jogos = (jogosData ?? []) as JogoRow[];
  const gastos = (gastosData ?? []) as GastoJogoComCategoriaRow[];
  const despesasAvulsas = (despesasAvulsasData ?? []) as DespesaAvulsaComCategoriaRow[];

  const porCategoria = new Map<string, { previsto: number; efetuado: number }>();
  for (const g of gastos) {
    const nome = g.categoria?.nome ?? "Outros";
    const atual = porCategoria.get(nome) ?? { previsto: 0, efetuado: 0 };
    atual.previsto += g.valor_previsto;
    atual.efetuado += g.valor_efetuado ?? 0;
    porCategoria.set(nome, atual);
  }
  for (const d of despesasAvulsas) {
    const nome = d.categoria?.nome ?? "Outros";
    const atual = porCategoria.get(nome) ?? { previsto: 0, efetuado: 0 };
    atual.previsto += d.valor_previsto;
    atual.efetuado += d.valor_efetuado ?? 0;
    porCategoria.set(nome, atual);
  }
  const linhasCategoria = Array.from(porCategoria.entries())
    .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
    .map(([nome, v]) => ({
      Categoria: nome,
      Previsto: v.previsto,
      Efetuado: v.efetuado,
      Diferença: v.previsto - v.efetuado,
    }));

  const gastosPorJogo = new Map<string, GastoJogoComCategoriaRow[]>();
  for (const g of gastos) {
    const lista = gastosPorJogo.get(g.jogo_id) ?? [];
    lista.push(g);
    gastosPorJogo.set(g.jogo_id, lista);
  }
  const linhasJogo = jogos
    .filter((j) => gastosPorJogo.has(j.id))
    .map((j) => {
      const gastosDoJogo = gastosPorJogo.get(j.id) ?? [];
      const previsto = gastosDoJogo.reduce((soma, g) => soma + g.valor_previsto, 0);
      const efetuado = gastosDoJogo.reduce((soma, g) => soma + (g.valor_efetuado ?? 0), 0);
      return {
        Jogo: `${j.mandante ? "Juventus" : j.adversario_nome} x ${j.mandante ? j.adversario_nome : "Juventus"}`,
        Competição: j.competicao,
        Data: formatData(j.data_jogo),
        Previsto: previsto,
        Efetuado: efetuado,
        Diferença: previsto - efetuado,
      };
    });

  const linhasDespesasAvulsas = despesasAvulsas.map((d) => ({
    Categoria: d.categoria?.nome ?? "Outros",
    Descrição: d.descricao ?? "",
    Data: formatData(d.data),
    Previsto: d.valor_previsto,
    Efetuado: d.valor_efetuado ?? 0,
    Diferença: d.valor_previsto - (d.valor_efetuado ?? 0),
  }));

  return buildXlsxResponse("prestacao-de-contas.xlsx", [
    { nome: "Por Categoria", linhas: linhasCategoria },
    { nome: "Por Jogo", linhas: linhasJogo },
    { nome: "Despesas Avulsas", linhas: linhasDespesasAvulsas },
  ]);
}
