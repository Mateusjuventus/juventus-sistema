"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  IconAssinaturaPendente,
  IconDepartamentoMedico,
  IconJogos,
  IconProgramacao,
  IconSolicitacoes,
} from "@/components/module-icons";
import { diasEntre, type Urgencia } from "@/lib/futebol/calendario";
import type {
  Aniversariante,
  AlertaPrazo,
  AtletaDm,
  ContratoAVencer,
  DepartamentoDashboard,
  ProgramacaoHojeItem,
  ProximoJogo,
  SolicitacaoPendente,
} from "@/lib/dashboard/queries";

/**
 * Dashboard/Painel principal — Home de `/profissional` e `/base` desde 14/11/2026 (ver
 * docs/superpowers/specs/2026-11-14-dashboard-principal-design.md), no lugar da Programação
 * Semanal (que se mudou pra `/profissional/programacao`/`/base/programacao`).
 *
 * Revisão de 14/11/2026 (mesmo dia, pedido direto do Mateus): o painel tinha ficado "separado" de
 * novo, contrariando a unificação em andamento no resto do sistema. Os dados já vêm MESCLADOS dos
 * dois departamentos quando a conta tem os dois liberados (`lib/dashboard/montar-dashboard.ts`,
 * chamado pelas duas páginas) — este componente só FILTRA em memória (`"use client"`, sem
 * refetch) pelos chips "Todos/Profissional/Base", que só aparecem quando `multiploDepartamento`
 * é `true`. Pra quem só tem um departamento, nada muda: sem chips, sem selo de departamento em
 * nenhum item (só aparece quando `item.departamento` vem preenchido, e só vem preenchido quando
 * há ambiguidade de verdade pra resolver).
 *
 * Tira do pedido "quero o painel mais interativo e com melhor visual, mas com a identidade do
 * Juventus" (não o literal de um dashboard de BI genérico — ver KpiTile abaixo): um resumo
 * numérico (KPI) por bloco visível no topo, e selos de urgência/prazo com a paleta validada pela
 * skill `dataviz` (`scripts/validate_palette.js`, todos os checks OK em modo claro) — RESERVADA
 * pra semântica de prazo (nunca reaproveitada pra "departamento", que continua grená/dourado, a
 * identidade do clube). Decisão deliberada, já alinhada com o Mateus: nenhum gráfico (donut/
 * barra/linha) nos 7 blocos — são listas de itens de ação, não métricas contínuas, e forçar um
 * gráfico aqui seria exatamente o anti-padrão que a própria skill adverte contra.
 *
 * Cada prop de bloco é `null` quando o módulo correspondente não está liberado pro usuário em
 * NENHUM dos departamentos que ele tem (o bloco inteiro não aparece) ou um objeto com `itens`
 * (lista vazia = mostra o card com o estado vazio, igual ao resto do sistema — "Nenhum registro
 * nessa categoria." em `app/atletas/page.tsx`, por exemplo). "Programação de hoje" é a única
 * exceção: a Programação não tem módulo com checkbox próprio (ver `lib/programacao/
 * permissoes.ts`), então é sempre visível pra quem chega até aqui.
 *
 * "Clicável" (pedido do Mateus) é resolvido de dois jeitos, dependendo se o bloco tem uma tela
 * cheia correspondente de verdade: Próximos Jogos, Atletas no DM, Solicitações Pendentes e
 * Programação de Hoje linkam o CARD inteiro pra sua listagem (jogos/atletas/solicitações/
 * programação); Contratos a Vencer, Aniversariantes e Alertas de Prazo não têm uma "tela cheia"
 * própria no sistema (não existe relatório de "contratos vencendo" nem "aniversariantes do mês"),
 * então cada LINHA vira o link, direto pro perfil/tela de origem daquele item específico — mais
 * útil do que inventar uma tela de destino que não existe.
 */

const COR_JOGOS = "#5C0A35";
const COR_CONTRATOS = "#B98F1E";
const COR_ANIVERSARIO = "#2F6FA3";
const COR_ALERTAS = "#B4232C";
const COR_DM = "#1E7A4C";
const COR_SOLICITACOES = "#8A8D91";
const COR_PROGRAMACAO = "#5C0A35";

/** Paleta de urgência/prazo — validada com `scripts/validate_palette.js` da skill `dataviz`
 * (todos os checks OK em modo claro: separação CVD ≥ ΔE 15 entre as 3 cores pra visão normal, sem
 * reciclar hue nenhum das cores de marca). RESERVADA pra semântica de prazo (Alertas de Prazo,
 * Contratos a Vencer perto do fim, Solicitações com prazo perto) — nunca reaproveitada pra outra
 * coisa, e nunca a cor de "departamento" (grená/dourado, ver `BadgeDepartamento`). Sempre junto de
 * ícone + texto (nunca só a cor) — ver `BadgeUrgencia`. */
const CORES_URGENCIA: Record<Urgencia, string> = {
  urgente: "#C62828",
  atencao: "#D98C0A",
  ok: "#1C7F52",
};

/** Mesmo limiar de `urgenciaPorDias` em `lib/dashboard/queries.ts`/`lib/futebol/calendario.ts` —
 * duplicado aqui (já é duplicado nos outros dois arquivos) porque este componente roda no client
 * e precisa calcular a urgência de Contratos/Solicitações em cima de `hojeStr` sem ida ao
 * servidor; mudar a regra de urgência nos três lugares juntos é responsabilidade de quem editar
 * qualquer um deles. */
function urgenciaPorDias(diasRestantes: number): Urgencia {
  return diasRestantes <= 2 ? "urgente" : diasRestantes <= 5 ? "atencao" : "ok";
}

function formatDataCurta(dataIso: string): string {
  const [, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}`;
}

/** Selo de departamento de origem — grená (#5C0A35) = Profissional, dourado (#B98F1E) = Base,
 * MESMOS tokens de `lib/theme.ts`/`tailwind.config.ts` usados no resto do sistema. Só aparece
 * quando `item.departamento` vem preenchido (Dashboard combinado); sempre com o texto
 * "Profissional"/"Base" junto da cor, nunca cor isolada. */
function BadgeDepartamento({ departamento }: { departamento?: DepartamentoDashboard }) {
  if (!departamento) return null;
  const cor = departamento === "profissional" ? "#5C0A35" : "#B98F1E";
  return (
    <span
      className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: `${cor}1A`, color: cor }}
    >
      {departamento === "profissional" ? "Profissional" : "Base"}
    </span>
  );
}

/** Selo de urgência/prazo — cor da paleta validada acima, sempre com um ícone (ponto preenchido)
 * + o texto do prazo (`texto`, ex. "Hoje"/"3d"), nunca só a cor (acessibilidade/daltonismo). */
function BadgeUrgencia({ urgencia, texto }: { urgencia: Urgencia; texto: string }) {
  const cor = CORES_URGENCIA[urgencia];
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: `${cor}1A`, color: cor }}
    >
      <svg viewBox="0 0 8 8" className="h-[6px] w-[6px]" fill="currentColor" aria-hidden="true">
        <circle cx="4" cy="4" r="4" />
      </svg>
      {texto}
    </span>
  );
}

/** Casca comum dos 7 cards — ícone + título + contagem, com ou sem link no cabeçalho (ver doc
 * comment do arquivo: só os blocos com uma tela cheia de verdade linkam o card inteiro). Sombra
 * reage ao hover quando o card é clicável — reforço visual do "interativo" pedido pelo Mateus,
 * sem introduzir nenhuma cor nova. */
function CardDashboard({
  titulo,
  icone,
  cor,
  contagem,
  href,
  children,
}: {
  titulo: string;
  icone: ReactNode;
  cor: string;
  contagem: number;
  href?: string;
  children: ReactNode;
}) {
  const cabecalho = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${cor}1A`, color: cor }}
        >
          {icone}
        </span>
        <h3 className="font-semibold text-neutral-800">{titulo}</h3>
      </div>
      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-neutral-500">
        {contagem}
      </span>
    </div>
  );

  return (
    <div className={`card flex flex-col gap-3 p-5 transition-shadow ${href ? "hover:shadow-md" : ""}`}>
      {href ? (
        <Link href={href} className="group -m-1 rounded-md p-1 transition-colors hover:bg-neutral-50">
          {cabecalho}
        </Link>
      ) : (
        cabecalho
      )}
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Vazio({ mensagem }: { mensagem: string }) {
  return <p className="py-2 text-sm text-neutral-400">{mensagem}</p>;
}

/** Mensagem de "vazio" ciente do filtro: quando o chip Profissional/Base está ativo e zerou uma
 * lista que tinha itens (do outro departamento), diz isso em vez de repetir a mensagem genérica
 * do bloco (que ficaria confusa — "nenhum X" quando na verdade há X, só não deste departamento). */
function mensagemVazio(padrao: string, totalSemFiltro: number, filtro: "todos" | DepartamentoDashboard): string {
  if (filtro !== "todos" && totalSemFiltro > 0) {
    return `Nada aqui no Futebol ${filtro === "profissional" ? "Profissional" : "de Base"} agora.`;
  }
  return padrao;
}

function LinhaItem({ href, children }: { href?: string | null; children: ReactNode }) {
  const classe =
    "flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition-colors -mx-2";
  if (!href) return <div className={classe}>{children}</div>;
  return (
    <Link href={href} className={`${classe} hover:bg-neutral-50`}>
      {children}
    </Link>
  );
}

function filtrarPorDepartamento<T extends { departamento?: DepartamentoDashboard }>(
  itens: T[],
  filtro: "todos" | DepartamentoDashboard,
): T[] {
  if (filtro === "todos") return itens;
  return itens.filter((item) => item.departamento === filtro);
}

/** Um "ladrilho" do resumo numérico do topo — número grande + rótulo + ícone (mesmo ícone do card
 * do bloco, pra ligar visualmente os dois). `urgente` só é `true` pra blocos com noção real de
 * prazo (Jogos iminentes, Contratos/Solicitações perto do fim, Alertas) — Aniversariantes,
 * Acompanhamento no DM e Programação não têm prazo, então nunca emprestam a paleta de urgência
 * (ela é reservada pra isso, ver comentário da paleta acima). */
function KpiTile({
  label,
  valor,
  icone,
  cor,
  urgente,
}: {
  label: string;
  valor: number;
  icone: ReactNode;
  cor: string;
  urgente?: boolean;
}) {
  return (
    <div className={`card flex items-center gap-3 p-4 ${urgente ? "ring-1 ring-[#C62828]/50" : ""}`}>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${cor}1A`, color: cor }}
      >
        {icone}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-2xl font-bold leading-none tabular-nums text-neutral-800">{valor}</span>
        <span className="truncate text-xs text-neutral-500">{label}</span>
      </div>
    </div>
  );
}

const CHIPS: { valor: "todos" | DepartamentoDashboard; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "profissional", label: "Profissional" },
  { valor: "base", label: "Base" },
];

/** Classe do chip de filtro — "Todos" reaproveita `btn-primary`/`btn-secondary` (já existem, sem
 * inventar um terceiro estilo); Profissional/Base ativos usam `bg-grena`/`bg-dourado`, os MESMOS
 * utilitários Tailwind que já existem em `tailwind.config.ts` pra essas cores de marca. */
function classeChip(valor: "todos" | DepartamentoDashboard, ativo: boolean): string {
  const base = "rounded-md px-3 py-1.5 text-sm font-medium transition-colors";
  if (!ativo) return "btn-secondary px-3 py-1.5 text-sm";
  if (valor === "profissional") return `${base} bg-grena text-white`;
  if (valor === "base") return `${base} bg-dourado text-white`;
  return "btn-primary px-3 py-1.5 text-sm";
}

export interface DashboardViewProps {
  /** `null` = módulo "jogos" não liberado em nenhum departamento que a conta tem. */
  jogos: { itens: (ProximoJogo & { departamento?: DepartamentoDashboard })[]; href: string } | null;
  /** `null` = módulo "atletas" não liberado em nenhum departamento que a conta tem. */
  contratos: { itens: (ContratoAVencer & { departamento?: DepartamentoDashboard })[] } | null;
  /** `null` = nem "atletas" nem "comissao_tecnica" liberados em nenhum departamento (as duas
   * fontes do card). */
  aniversariantes: { itens: (Aniversariante & { departamento?: DepartamentoDashboard })[] } | null;
  /** Cada sub-parte já vem filtrada por módulo (calendário é sempre incluído, sem módulo próprio)
   * — `null` só quando as 3 sub-partes estão vazias/bloqueadas ao mesmo tempo. */
  alertas: { itens: (AlertaPrazo & { departamento?: DepartamentoDashboard })[] } | null;
  /** `null` = módulo "departamento_medico" não liberado em nenhum departamento. */
  atletasDm: { itens: (AtletaDm & { departamento?: DepartamentoDashboard })[]; href: string } | null;
  /** `null` = módulo "solicitacoes" não liberado em nenhum departamento. */
  solicitacoes: { itens: (SolicitacaoPendente & { departamento?: DepartamentoDashboard })[]; href: string } | null;
  programacaoHoje: { itens: ProgramacaoHojeItem[]; href: string };
  /** "YYYY-MM-DD" de hoje (Brasília) — o MESMO valor que `lib/dashboard/montar-dashboard.ts` já
   * usou pra buscar os dados, repassado pra calcular aqui no client a urgência de Contratos/
   * Solicitações (que não vêm com `urgencia` pronta de `lib/dashboard/queries.ts`) sem precisar
   * buscar de novo. */
  hojeStr: string;
  /** Mostra os chips "Todos/Profissional/Base" — só quando a conta tem os dois departamentos
   * liberados (`getDepartamentosPermitidos`). Com um só, nunca aparece: não há nada pra filtrar,
   * e nenhum item desta tela vem com `departamento` preenchido de qualquer forma. */
  multiploDepartamento: boolean;
}

export function DashboardView({
  jogos,
  contratos,
  aniversariantes,
  alertas,
  atletasDm,
  solicitacoes,
  programacaoHoje,
  hojeStr,
  multiploDepartamento,
}: DashboardViewProps) {
  const [filtro, setFiltro] = useState<"todos" | DepartamentoDashboard>("todos");

  // Reconstrói cada bloco com os itens já filtrados, preservando o mesmo formato ({ itens, href? }
  // | null) que o resto do componente já esperava antes da revisão de 14/11 — o filtro em si é só
  // um `.filter()` em memória, sem refetch (pedido explícito do Mateus/diretriz: client-side).
  const jogosView = jogos ? { ...jogos, itens: filtrarPorDepartamento(jogos.itens, filtro) } : null;
  const contratosView = contratos ? { ...contratos, itens: filtrarPorDepartamento(contratos.itens, filtro) } : null;
  const aniversariantesView = aniversariantes
    ? { ...aniversariantes, itens: filtrarPorDepartamento(aniversariantes.itens, filtro) }
    : null;
  const alertasView = alertas ? { ...alertas, itens: filtrarPorDepartamento(alertas.itens, filtro) } : null;
  const atletasDmView = atletasDm ? { ...atletasDm, itens: filtrarPorDepartamento(atletasDm.itens, filtro) } : null;
  const solicitacoesView = solicitacoes
    ? { ...solicitacoes, itens: filtrarPorDepartamento(solicitacoes.itens, filtro) }
    : null;

  const kpis: { key: string; label: string; valor: number; icone: ReactNode; cor: string; urgente: boolean }[] = [];
  if (jogosView) {
    kpis.push({
      key: "jogos",
      label: "Próximos jogos",
      valor: jogosView.itens.length,
      icone: <IconJogos className="h-[18px] w-[18px]" />,
      cor: COR_JOGOS,
      urgente: jogosView.itens.some((j) => diasEntre(hojeStr, j.data_jogo) <= 2),
    });
  }
  if (contratosView) {
    kpis.push({
      key: "contratos",
      label: "Contratos a vencer",
      valor: contratosView.itens.length,
      icone: <IconAssinaturaPendente className="h-[18px] w-[18px]" />,
      cor: COR_CONTRATOS,
      urgente: contratosView.itens.some((c) => urgenciaPorDias(diasEntre(hojeStr, c.vigenciaFim)) !== "ok"),
    });
  }
  if (aniversariantesView) {
    kpis.push({
      key: "aniversariantes",
      label: "Aniversariantes",
      valor: aniversariantesView.itens.length,
      icone: (
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v4M8 4v2M16 4v2" />
          <path d="M4 10h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V10Z" />
          <path d="M4 14c1 1 2 1 3 0s2-1 3 0 2 1 3 0 2-1 3 0 2 1 3 0" />
        </svg>
      ),
      cor: COR_ANIVERSARIO,
      urgente: false,
    });
  }
  if (alertasView) {
    kpis.push({
      key: "alertas",
      label: "Alertas de prazo",
      valor: alertasView.itens.length,
      icone: <IconAssinaturaPendente className="h-[18px] w-[18px]" />,
      cor: COR_ALERTAS,
      urgente: alertasView.itens.some((a) => a.urgencia === "urgente"),
    });
  }
  if (atletasDmView) {
    kpis.push({
      key: "dm",
      label: "No DM",
      valor: atletasDmView.itens.length,
      icone: <IconDepartamentoMedico className="h-[18px] w-[18px]" />,
      cor: COR_DM,
      urgente: false,
    });
  }
  if (solicitacoesView) {
    kpis.push({
      key: "solicitacoes",
      label: "Solicitações",
      valor: solicitacoesView.itens.length,
      icone: <IconSolicitacoes className="h-[18px] w-[18px]" />,
      cor: COR_SOLICITACOES,
      urgente: solicitacoesView.itens.some(
        (s) => !!s.prazoSugerido && urgenciaPorDias(diasEntre(hojeStr, s.prazoSugerido)) !== "ok",
      ),
    });
  }
  kpis.push({
    key: "programacao",
    label: "Hoje na agenda",
    valor: programacaoHoje.itens.length,
    icone: <IconProgramacao className="h-[18px] w-[18px]" />,
    cor: COR_PROGRAMACAO,
    urgente: false,
  });

  return (
    <div className="flex flex-col gap-4">
      {multiploDepartamento ? (
        <div className="flex flex-wrap gap-2">
          {CHIPS.map((chip) => (
            <button
              key={chip.valor}
              type="button"
              onClick={() => setFiltro(chip.valor)}
              className={classeChip(chip.valor, filtro === chip.valor)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {kpis.map((kpi) => (
          <KpiTile key={kpi.key} label={kpi.label} valor={kpi.valor} icone={kpi.icone} cor={kpi.cor} urgente={kpi.urgente} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {jogosView ? (
          <CardDashboard
            titulo="Próximos jogos"
            icone={<IconJogos className="h-[18px] w-[18px]" />}
            cor={COR_JOGOS}
            contagem={jogosView.itens.length}
            href={jogosView.href}
          >
            {jogosView.itens.length === 0 ? (
              <Vazio mensagem={mensagemVazio("Nenhum jogo agendado.", jogos!.itens.length, filtro)} />
            ) : (
              jogosView.itens.map((j) => (
                <LinhaItem key={j.id}>
                  <span className="min-w-0 truncate text-neutral-700">
                    {j.mandante ? `Juventus x ${j.adversario_nome}` : `${j.adversario_nome} x Juventus`}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <BadgeDepartamento departamento={j.departamento} />
                    <span className="text-xs text-neutral-400">{formatDataCurta(j.data_jogo)}</span>
                  </span>
                </LinhaItem>
              ))
            )}
          </CardDashboard>
        ) : null}

        {contratosView ? (
          <CardDashboard
            titulo="Contratos a vencer"
            icone={<IconAssinaturaPendente className="h-[18px] w-[18px]" />}
            cor={COR_CONTRATOS}
            contagem={contratosView.itens.length}
          >
            {contratosView.itens.length === 0 ? (
              <Vazio
                mensagem={mensagemVazio(
                  "Nenhum contrato vencendo nos próximos 90 dias.",
                  contratos!.itens.length,
                  filtro,
                )}
              />
            ) : (
              contratosView.itens.map((c) => {
                const dias = diasEntre(hojeStr, c.vigenciaFim);
                const urgencia = urgenciaPorDias(dias);
                return (
                  <LinhaItem key={c.atletaId} href={`/atletas/${c.atletaId}`}>
                    <span className="min-w-0 truncate text-neutral-700">{c.nomeCompleto}</span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <BadgeDepartamento departamento={c.departamento} />
                      {urgencia !== "ok" ? (
                        <BadgeUrgencia
                          urgencia={urgencia}
                          texto={dias === 0 ? "Hoje" : dias === 1 ? "Amanhã" : `${dias}d`}
                        />
                      ) : (
                        <span className="text-xs text-neutral-400">{formatDataCurta(c.vigenciaFim)}</span>
                      )}
                    </span>
                  </LinhaItem>
                );
              })
            )}
          </CardDashboard>
        ) : null}

        {aniversariantesView ? (
          <CardDashboard
            titulo="Aniversariantes do mês"
            icone={
              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v4M8 4v2M16 4v2" />
                <path d="M4 10h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V10Z" />
                <path d="M4 14c1 1 2 1 3 0s2-1 3 0 2 1 3 0 2-1 3 0 2 1 3 0" />
              </svg>
            }
            cor={COR_ANIVERSARIO}
            contagem={aniversariantesView.itens.length}
          >
            {aniversariantesView.itens.length === 0 ? (
              <Vazio
                mensagem={mensagemVazio("Nenhum aniversariante este mês.", aniversariantes!.itens.length, filtro)}
              />
            ) : (
              aniversariantesView.itens.map((a) => (
                <LinhaItem
                  key={`${a.origem}-${a.id}`}
                  href={a.origem === "atleta" ? `/atletas/${a.id}` : `/comissao-tecnica/${a.id}`}
                >
                  <span className="min-w-0 truncate text-neutral-700">{a.nomeCompleto}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <BadgeDepartamento departamento={a.departamento} />
                    <span className="text-xs text-neutral-400">{formatDataCurta(a.dataNascimento)}</span>
                  </span>
                </LinhaItem>
              ))
            )}
          </CardDashboard>
        ) : null}

        {alertasView ? (
          <CardDashboard
            titulo="Alertas de prazo"
            icone={<IconAssinaturaPendente className="h-[18px] w-[18px]" />}
            cor={COR_ALERTAS}
            contagem={alertasView.itens.length}
          >
            {alertasView.itens.length === 0 ? (
              <Vazio
                mensagem={mensagemVazio("Nenhum prazo chegando nos próximos dias.", alertas!.itens.length, filtro)}
              />
            ) : (
              alertasView.itens.map((a, i) => (
                <LinhaItem key={i} href={a.href}>
                  <div className="min-w-0">
                    <p className="truncate text-neutral-700">{a.titulo}</p>
                    {a.subtitulo ? <p className="truncate text-xs text-neutral-400">{a.subtitulo}</p> : null}
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <BadgeDepartamento departamento={a.departamento} />
                    <BadgeUrgencia
                      urgencia={a.urgencia}
                      texto={a.diasRestantes === 0 ? "Hoje" : a.diasRestantes === 1 ? "Amanhã" : `${a.diasRestantes}d`}
                    />
                  </span>
                </LinhaItem>
              ))
            )}
          </CardDashboard>
        ) : null}

        {atletasDmView ? (
          <CardDashboard
            titulo="Acompanhamento no DM"
            icone={<IconDepartamentoMedico className="h-[18px] w-[18px]" />}
            cor={COR_DM}
            contagem={atletasDmView.itens.length}
            href={atletasDmView.href}
          >
            {atletasDmView.itens.length === 0 ? (
              <Vazio
                mensagem={mensagemVazio(
                  "Nenhum atleta em acompanhamento no DM.",
                  atletasDm!.itens.length,
                  filtro,
                )}
              />
            ) : (
              atletasDmView.itens.map((a) => (
                <LinhaItem key={a.id}>
                  <span className="min-w-0 truncate text-neutral-700">{a.nomeCompleto}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <BadgeDepartamento departamento={a.departamento} />
                    <span className="text-xs text-neutral-400">{a.categoriaLabel}</span>
                  </span>
                </LinhaItem>
              ))
            )}
          </CardDashboard>
        ) : null}

        {solicitacoesView ? (
          <CardDashboard
            titulo="Solicitações pendentes"
            icone={<IconSolicitacoes className="h-[18px] w-[18px]" />}
            cor={COR_SOLICITACOES}
            contagem={solicitacoesView.itens.length}
            href={solicitacoesView.href}
          >
            {solicitacoesView.itens.length === 0 ? (
              <Vazio
                mensagem={mensagemVazio("Nenhuma solicitação pendente.", solicitacoes!.itens.length, filtro)}
              />
            ) : (
              solicitacoesView.itens.map((s) => {
                // `prazoSugerido` é sugestão de quem abriu a solicitação — diferente de
                // `vigenciaFim`/`data_fim` (sem garantia no banco de que fica no futuro), por
                // isso trata `dias < 0` como "Atrasado" em vez de um rótulo negativo confuso.
                const dias = s.prazoSugerido ? diasEntre(hojeStr, s.prazoSugerido) : null;
                const urgencia = dias !== null ? urgenciaPorDias(Math.max(0, dias)) : null;
                return (
                  <LinhaItem key={s.id}>
                    <span className="min-w-0 truncate text-neutral-700">
                      Nº {String(s.numero).padStart(3, "0")} · {s.solicitante}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <BadgeDepartamento departamento={s.departamento} />
                      {urgencia && urgencia !== "ok" && dias !== null ? (
                        <BadgeUrgencia
                          urgencia={urgencia}
                          texto={dias < 0 ? "Atrasado" : dias === 0 ? "Hoje" : dias === 1 ? "Amanhã" : `${dias}d`}
                        />
                      ) : (
                        <span className="text-xs text-neutral-400">
                          {s.prazoSugerido ? formatDataCurta(s.prazoSugerido) : "sem prazo"}
                        </span>
                      )}
                    </span>
                  </LinhaItem>
                );
              })
            )}
          </CardDashboard>
        ) : null}

        <CardDashboard
          titulo="Programação de hoje"
          icone={<IconProgramacao className="h-[18px] w-[18px]" />}
          cor={COR_PROGRAMACAO}
          contagem={programacaoHoje.itens.length}
        >
          {programacaoHoje.itens.length === 0 ? (
            <Vazio mensagem="Nenhuma atividade programada pra hoje." />
          ) : (
            programacaoHoje.itens.map((item) => (
              <LinhaItem key={item.id}>
                <span className="min-w-0 truncate text-neutral-700">{item.nome}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span className="text-xs text-neutral-400">{item.categoriaLabel}</span>
                  <span className="text-xs text-neutral-400">
                    {item.horarioInicio ? item.horarioInicio.slice(0, 5) : "—"}
                  </span>
                </span>
              </LinhaItem>
            ))
          )}
          <Link href={programacaoHoje.href} className="btn-secondary mt-1 self-start text-sm">
            Ver semana completa
          </Link>
        </CardDashboard>
      </div>
    </div>
  );
}
