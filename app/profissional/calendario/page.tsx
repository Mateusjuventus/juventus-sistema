import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { getModulosPermitidos } from "@/lib/auth/role";
import { hojeBrasilia } from "@/lib/data-brasil";
import { agruparPorDia, gradeDoMes, limitesDoMes, mesAdjacente, montarItensCalendario } from "@/lib/futebol/calendario";
import type { EventoCalendarioRow, JogoRow } from "@/lib/supabase/types";
import { CalendarioWidget } from "../calendario-widget";

/** `ano`/`mes` vêm da URL como string (ou ausentes) — valida pra um inteiro dentro de uma faixa
 * razoável, cai no mês atual quando ausente/inválido (mesmo comportamento de antes da navegação
 * existir, ver docs/superpowers/specs/2026-11-04-ajustes-rapidos-calendario-painel-atletas-design.md). */
function mesDaUrl(valor: string | undefined, min: number, max: number, padrao: number): number {
  const numero = Number(valor);
  return valor !== undefined && Number.isInteger(numero) && numero >= min && numero <= max ? numero : padrao;
}

/**
 * Calendário do Futebol Profissional — até 05/10 isso vivia dentro do Início (painel com
 * calendário + Mural + Próximo Jogo + Contratos Vencendo + números-resumo, redesenhado em 07/08).
 * O Início virou a Programação Semanal (ver docs/superpowers/specs/2026-10-05-programacao-
 * profissional-design.md); o calendário ganhou esta tela própria, SEM os outros widgets — decisão
 * explícita do Mateus ("ficará somente o calendário mesmo... saem junto" os números e os outros 3
 * widgets). O código deles (`mural-widget.tsx`, `proximo-jogo-widget.tsx`,
 * `proximos-jogos-widget.tsx`) foi removido daqui, mas continua no histórico do git.
 *
 * Sem o módulo "jogos" liberado, a pessoa ainda vê o calendário, só que sem os jogos (só os eventos
 * manuais) — mesma régua de permissão que o widget já respeitava dentro do Início.
 *
 * `?ano=&mes=` deixam navegar pra outro mês (ver docs/superpowers/specs/2026-11-04-ajustes-
 * rapidos-calendario-painel-atletas-design.md) — ausentes/inválidos caem no mês atual, mesmo
 * comportamento de antes dessa navegação existir.
 */
export default async function ProfissionalCalendarioPage({
  searchParams,
}: {
  searchParams: { ano?: string; mes?: string };
}) {
  const supabase = createClient();
  const hojeStr = hojeBrasilia();
  const [anoHoje, mesHoje] = hojeStr.split("-").map(Number);
  const ano = mesDaUrl(searchParams.ano, 2000, 2100, anoHoje);
  const mes = mesDaUrl(searchParams.mes, 1, 12, mesHoje);
  const { inicio: inicioMes, fim: fimMes } = limitesDoMes(ano, mes);

  const [modulosPermitidos, { data: eventosDoMesData }] = await Promise.all([
    getModulosPermitidos(supabase),
    supabase.from("eventos_calendario").select("*").gte("data", inicioMes).lte("data", fimMes),
  ]);
  const temJogos = (modulosPermitidos as string[]).includes("jogos");

  const jogosDoMesData = temJogos
    ? (
        await supabase
          .from("jogos")
          .select("*")
          .eq("categoria", "profissional")
          .gte("data_jogo", inicioMes)
          .lte("data_jogo", fimMes)
      ).data
    : [];

  const jogosDoMes = (jogosDoMesData ?? []) as JogoRow[];
  const eventosDoMes = (eventosDoMesData ?? []) as EventoCalendarioRow[];
  const itensDoMes = montarItensCalendario(jogosDoMes, eventosDoMes);
  const itensPorDia = agruparPorDia(itensDoMes);
  const grade = gradeDoMes(ano, mes);

  const logoPorJogoId = new Map<string, string | null>(
    await Promise.all(
      jogosDoMes.map(async (jogo): Promise<[string, string | null]> => [
        jogo.id,
        await getSignedPhotoUrl(supabase, jogo.adversario_logo_path),
      ]),
    ),
  );

  const mesAnterior = mesAdjacente(ano, mes, -1);
  const mesSeguinte = mesAdjacente(ano, mes, 1);

  return (
    <AppShell breadcrumb="Calendário">
      <CalendarioWidget
        ano={ano}
        mes={mes}
        grade={grade}
        itensPorDia={itensPorDia}
        itensDoMes={itensDoMes}
        logoPorJogoId={logoPorJogoId}
        hojeStr={hojeStr}
        ehMesAtual={ano === anoHoje && mes === mesHoje}
        hrefMesAnterior={`/profissional/calendario?ano=${mesAnterior.ano}&mes=${mesAnterior.mes}`}
        hrefMesSeguinte={`/profissional/calendario?ano=${mesSeguinte.ano}&mes=${mesSeguinte.mes}`}
        hrefHoje="/profissional/calendario"
      />
    </AppShell>
  );
}
