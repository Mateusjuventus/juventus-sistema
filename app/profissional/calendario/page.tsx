import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { getModulosPermitidos } from "@/lib/auth/role";
import { hojeBrasilia } from "@/lib/data-brasil";
import { agruparPorDia, gradeDoMes, limitesDoMes, montarItensCalendario } from "@/lib/futebol/calendario";
import type { EventoCalendarioRow, JogoRow } from "@/lib/supabase/types";
import { CalendarioWidget } from "../calendario-widget";

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
 */
export default async function ProfissionalCalendarioPage() {
  const supabase = createClient();
  const hojeStr = hojeBrasilia();
  const [ano, mes] = hojeStr.split("-").map(Number);
  const { inicio: inicioMes, fim: fimMes } = limitesDoMes(ano, mes);

  const [modulosPermitidos, { data: eventosDoMesData }] = await Promise.all([
    getModulosPermitidos(supabase),
    supabase.from("eventos_calendario").select("*").gte("data", inicioMes).lte("data", fimMes),
  ]);
  const temJogos = (modulosPermitidos as string[]).includes("jogos");

  const jogosDoMesData = temJogos
    ? (await supabase.from("jogos").select("*").gte("data_jogo", inicioMes).lte("data_jogo", fimMes)).data
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
      />
    </AppShell>
  );
}
