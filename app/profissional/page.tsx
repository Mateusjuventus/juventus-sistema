import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { getModulosPermitidos } from "@/lib/auth/role";
import { hojeBrasilia } from "@/lib/data-brasil";
import {
  adicionarDias,
  agruparPorDia,
  atletasContratoVencendo,
  diasEntre,
  gradeDoMes,
  itensMural,
  limitesDoMes,
  montarItensCalendario,
} from "@/lib/futebol/calendario";
import type { AtletaParaContratoVencendo } from "@/lib/futebol/calendario";
import type { EventoCalendarioRow, JogoRow } from "@/lib/supabase/types";
import { CalendarioWidget } from "./calendario-widget";
import { ProximoJogoWidget } from "./proximo-jogo-widget";
import { ContratosVencendoWidget } from "./contratos-vencendo-widget";
import { MuralWidget } from "./mural-widget";

const DIAS_JANELA_MURAL = 10;
const DIAS_JANELA_CONTRATO = 90;

/** Conta linhas de uma tabela sem trazer os dados (head: true), pra montar os números da faixa de
 * resumo. */
async function contarLinhas(supabase: ReturnType<typeof createClient>, tabela: string): Promise<number> {
  const { count } = await supabase.from(tabela).select("*", { count: "exact", head: true });
  return count ?? 0;
}

/**
 * Painel de Início do Futebol Profissional — redesenhado pra ser um painel de verdade (calendário
 * editável, mural de avisos, próximo jogo, contratos vencendo) em vez de uma grade de atalhos pros
 * módulos: os atalhos agora moram na sidebar (`components/app-sidebar.tsx`), então repeti-los aqui
 * ficou redundante (ver docs/superpowers/specs/2026-08-07-redesign-visual-painel-financeiro-design.md).
 *
 * Nota sobre permissão: a faixa de resumo e os widgets "Calendário"/"Próximo jogo" continuam
 * escondidos de quem não tem o módulo "jogos" liberado, e "Contratos vencendo" de quem não tem
 * "atletas" — mesma checagem que já existia antes do redesign, só estendida pros números novos. O
 * Mural não tem essa checagem: mistura jogos com eventos manuais (`eventos_calendario`, que não
 * tem controle de módulo nenhum hoje), então fica visível pra quem chegar em `/profissional` — só
 * datas/títulos, sem dado sensível. A spec não detalhou esse ponto; é a leitura mais conservadora
 * que dava pra fazer sem inventar uma regra nova de permissão por conta própria.
 */
export default async function ProfissionalPage() {
  const supabase = createClient();
  const hojeStr = hojeBrasilia();
  const [ano, mes] = hojeStr.split("-").map(Number);
  const { inicio: inicioMes, fim: fimMes } = limitesDoMes(ano, mes);
  const limiteMuralStr = adicionarDias(hojeStr, DIAS_JANELA_MURAL);
  const limiteContratoStr = adicionarDias(hojeStr, DIAS_JANELA_CONTRATO);

  const [
    totalAtletas,
    { count: totalStaffCount },
    { data: contratosVencendoData },
    { data: proximoJogoData },
    { data: jogosDoMesData },
    { data: eventosDoMesData },
    { data: jogosMuralData },
    { data: eventosMuralData },
    modulosPermitidos,
  ] = await Promise.all([
    contarLinhas(supabase, "atletas"),
    supabase.from("staff_operacional").select("*", { count: "exact", head: true }).eq("ativo", true),
    supabase
      .from("atletas")
      .select("id, nome_completo, posicao, data_fim_contrato")
      .not("data_fim_contrato", "is", null)
      .gte("data_fim_contrato", hojeStr)
      .lte("data_fim_contrato", limiteContratoStr),
    supabase.from("jogos").select("*").gte("data_jogo", hojeStr).order("data_jogo", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("jogos").select("*").gte("data_jogo", inicioMes).lte("data_jogo", fimMes),
    supabase.from("eventos_calendario").select("*").gte("data", inicioMes).lte("data", fimMes),
    supabase.from("jogos").select("*").gte("data_jogo", hojeStr).lte("data_jogo", limiteMuralStr),
    supabase.from("eventos_calendario").select("*").gte("data", hojeStr).lte("data", limiteMuralStr),
    getModulosPermitidos(supabase),
  ]);

  const temModulo = (chave: string) => (modulosPermitidos as string[]).includes(chave);
  const totalStaff = totalStaffCount ?? 0;

  const contratosVencendo = atletasContratoVencendo(
    (contratosVencendoData ?? []) as AtletaParaContratoVencendo[],
    hojeStr,
    DIAS_JANELA_CONTRATO,
  );

  const proximoJogo = proximoJogoData as JogoRow | null;
  const adversarioLogoUrl = proximoJogo ? await getSignedPhotoUrl(supabase, proximoJogo.adversario_logo_path) : null;
  const diasProximoJogo = proximoJogo ? diasEntre(hojeStr, proximoJogo.data_jogo) : null;

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

  const jogosMural = (jogosMuralData ?? []) as JogoRow[];
  const eventosMural = (eventosMuralData ?? []) as EventoCalendarioRow[];
  // Consulta separada da grade do mês de propósito: a janela de 10 dias do Mural pode atravessar
  // pro mês seguinte (ex: hoje é dia 28), e a grade do widget "Calendário" só cobre o mês corrente.
  const mural = itensMural(montarItensCalendario(jogosMural, eventosMural), hojeStr, DIAS_JANELA_MURAL);

  const estatisticas = [
    { moduloChave: "atletas", valor: totalAtletas, label: "Atletas ativos" },
    { moduloChave: "staff_operacional", valor: totalStaff, label: "Staff ativo" },
    { moduloChave: "atletas", valor: contratosVencendo.length, label: "Contratos vencendo (90d)" },
    {
      moduloChave: "jogos",
      valor: diasProximoJogo === null ? "—" : diasProximoJogo === 0 ? "Hoje" : `${diasProximoJogo}`,
      label: "Dias até o próximo jogo",
    },
  ].filter((item) => temModulo(item.moduloChave));

  return (
    <AppShell breadcrumb="Futebol Profissional">
      <h1 className="text-xl font-extrabold text-grena-escuro">Futebol Profissional</h1>

      <div className="mt-4 grid grid-cols-[1fr_224px] gap-4 max-lg:grid-cols-1">
        <div className="min-w-0 space-y-4">
          {estatisticas.length > 0 ? (
            <div className="grid grid-cols-2 divide-x divide-linha rounded-lg border border-linha bg-white sm:grid-cols-4 sm:divide-x">
              {estatisticas.map((item, i) => (
                <div key={item.label} className={`p-4 ${i >= 2 ? "border-t border-linha sm:border-t-0" : ""}`}>
                  <p className="text-xl font-extrabold text-neutral-800">{item.valor}</p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {temModulo("jogos") ? (
            <CalendarioWidget
              ano={ano}
              mes={mes}
              grade={grade}
              itensPorDia={itensPorDia}
              itensDoMes={itensDoMes}
              logoPorJogoId={logoPorJogoId}
              hojeStr={hojeStr}
            />
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {temModulo("jogos") ? <ProximoJogoWidget jogo={proximoJogo} adversarioLogoUrl={adversarioLogoUrl} /> : null}
            {temModulo("atletas") ? <ContratosVencendoWidget itens={contratosVencendo} /> : null}
          </div>
        </div>

        <div className="min-w-0">
          <MuralWidget itens={mural} />
        </div>
      </div>
    </AppShell>
  );
}
