import { createClient } from "@/lib/supabase/server";
import { buildXlsxResponse } from "@/lib/xlsx-export";
import type { GastoJogoBaseComCategoriaRow, JogoBaseRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

function formatData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Espelha `app/financeiro/export/route.ts` para o Futebol de Base. */
export async function GET() {
  const supabase = createClient();

  const [{ data: jogosData }, { data: gastosData }] = await Promise.all([
    supabase.from("jogos_base").select("*").order("data_jogo", { ascending: false }),
    supabase.from("gastos_jogo_base").select("*, categoria:categorias_gasto(nome)"),
  ]);

  const jogos = (jogosData ?? []) as JogoBaseRow[];
  const gastos = (gastosData ?? []) as GastoJogoBaseComCategoriaRow[];

  const porCategoria = new Map<string, { previsto: number; efetuado: number }>();
  for (const g of gastos) {
    const nome = g.categoria?.nome ?? "Outros";
    const atual = porCategoria.get(nome) ?? { previsto: 0, efetuado: 0 };
    atual.previsto += g.valor_previsto;
    atual.efetuado += g.valor_efetuado ?? 0;
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

  const gastosPorJogo = new Map<string, GastoJogoBaseComCategoriaRow[]>();
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

  return buildXlsxResponse("prestacao-de-contas-base.xlsx", [
    { nome: "Por Categoria", linhas: linhasCategoria },
    { nome: "Por Jogo", linhas: linhasJogo },
  ]);
}
