import { type NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildXlsxResponse } from "@/lib/xlsx-export";
import { ehCategoriaBaseValida, categoriaBaseLabel } from "@/lib/auth/categorias-base";
import type { JogoBaseRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

function formatData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatHorario(horario: string | null): string {
  if (!horario) return "";
  return horario.slice(0, 5);
}

function formatResultado(j: JogoBaseRow): string {
  if (j.gols_pro === null || j.gols_contra === null) return "";
  if (j.gols_pro > j.gols_contra) return "Vitória";
  if (j.gols_pro < j.gols_contra) return "Derrota";
  return "Empate";
}

/** Exporta a lista de Jogos de uma categoria do Futebol de Base pra Excel — espelha
 * `app/jogos/export/route.ts`, filtrado pela categoria da URL. */
export async function GET(request: NextRequest, { params }: { params: { categoria: string } }) {
  if (!ehCategoriaBaseValida(params.categoria)) notFound();
  const categoria = params.categoria;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const mandanteFiltro = searchParams.get("mandante") ?? "";
  const supabase = createClient();

  let query = supabase.from("jogos_base").select("*").eq("categoria", categoria).order("data_jogo", { ascending: false });
  if (q) query = query.ilike("adversario_nome", `%${q}%`);
  if (mandanteFiltro === "casa") query = query.eq("mandante", true);
  if (mandanteFiltro === "fora") query = query.eq("mandante", false);

  const { data } = await query;
  const jogos = (data ?? []) as JogoBaseRow[];

  const linhas = jogos.map((j) => ({
    Adversário: j.adversario_nome,
    "Mandante/Visitante": j.mandante ? "Em casa" : "Fora",
    Competição: j.competicao,
    "Rodada/Fase": j.rodada_fase ?? "",
    Data: formatData(j.data_jogo),
    Horário: formatHorario(j.horario),
    Local: j.local_estadio ?? "",
    "Gols Juventus": j.gols_pro ?? "",
    "Gols adversário": j.gols_contra ?? "",
    Resultado: formatResultado(j),
  }));

  return buildXlsxResponse(`jogos-base-${categoria}.xlsx`, [
    { nome: categoriaBaseLabel(categoria), linhas },
  ]);
}
