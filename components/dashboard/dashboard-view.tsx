import Link from "next/link";
import type { ReactNode } from "react";
import {
  IconAssinaturaPendente,
  IconDepartamentoMedico,
  IconJogos,
  IconProgramacao,
  IconSolicitacoes,
} from "@/components/module-icons";
import type {
  Aniversariante,
  AlertaPrazo,
  AtletaDm,
  ContratoAVencer,
  ProgramacaoHojeItem,
  ProximoJogo,
  SolicitacaoPendente,
} from "@/lib/dashboard/queries";

/**
 * Dashboard/Painel principal — Home de `/profissional` e `/base` desde 14/11/2026 (ver
 * docs/superpowers/specs/2026-11-14-dashboard-principal-design.md), no lugar da Programação
 * Semanal (que se mudou pra `/profissional/programacao`/`/base/programacao`). 7 blocos
 * clicáveis, cada um já com os dados filtrados por permissão/departamento resolvidos pela página
 * (Server Component) — este componente só apresenta, mesmo raciocínio de `ProgramacaoView`
 * (não decide quem pode ver o quê).
 *
 * Cada prop de bloco é `null` quando o módulo correspondente não está liberado pro usuário (o
 * bloco inteiro não aparece) ou um objeto com `itens` (lista vazia = mostra o card com o
 * estado vazio, igual ao resto do sistema — "Nenhum registro nessa categoria." em
 * `app/atletas/page.tsx`, por exemplo). "Programação de hoje" é a única exceção: a Programação
 * não tem módulo com checkbox próprio (ver `lib/programacao/permissoes.ts`), então é sempre
 * visível pra quem chega até aqui.
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

function formatDataCurta(dataIso: string): string {
  const [, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}`;
}

/** Casca comum dos 7 cards — ícone + título + contagem, com ou sem link no cabeçalho (ver doc
 * comment do arquivo: só os blocos com uma tela cheia de verdade linkam o card inteiro). */
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
    <div className="card flex flex-col gap-3 p-5">
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

const CORES_URGENCIA: Record<"urgente" | "atencao" | "ok", string> = {
  urgente: "bg-red-50 text-red-700",
  atencao: "bg-amber-50 text-amber-700",
  ok: "bg-emerald-50 text-emerald-700",
};

export interface DashboardViewProps {
  /** `null` = módulo "jogos" não liberado (card some). */
  jogos: { itens: ProximoJogo[]; href: string } | null;
  /** `null` = módulo "atletas" não liberado. */
  contratos: { itens: ContratoAVencer[] } | null;
  /** `null` = nem "atletas" nem "comissao_tecnica" liberados (as duas fontes do card). */
  aniversariantes: { itens: Aniversariante[] } | null;
  /** Cada sub-parte já vem filtrada por módulo pela página (calendário é sempre incluído, sem
   * módulo próprio) — `null` só quando as 3 sub-partes estão vazias/bloqueadas ao mesmo tempo. */
  alertas: { itens: AlertaPrazo[] } | null;
  /** `null` = módulo "departamento_medico" não liberado. */
  atletasDm: { itens: AtletaDm[]; href: string } | null;
  /** `null` = módulo "solicitacoes" não liberado. */
  solicitacoes: { itens: SolicitacaoPendente[]; href: string } | null;
  programacaoHoje: { itens: ProgramacaoHojeItem[]; href: string };
}

export function DashboardView({
  jogos,
  contratos,
  aniversariantes,
  alertas,
  atletasDm,
  solicitacoes,
  programacaoHoje,
}: DashboardViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {jogos ? (
        <CardDashboard
          titulo="Próximos jogos"
          icone={<IconJogos className="h-[18px] w-[18px]" />}
          cor={COR_JOGOS}
          contagem={jogos.itens.length}
          href={jogos.href}
        >
          {jogos.itens.length === 0 ? (
            <Vazio mensagem="Nenhum jogo agendado." />
          ) : (
            jogos.itens.map((j) => (
              <LinhaItem key={j.id}>
                <span className="min-w-0 truncate text-neutral-700">
                  {j.mandante ? `Juventus x ${j.adversario_nome}` : `${j.adversario_nome} x Juventus`}
                </span>
                <span className="shrink-0 text-xs text-neutral-400">{formatDataCurta(j.data_jogo)}</span>
              </LinhaItem>
            ))
          )}
        </CardDashboard>
      ) : null}

      {contratos ? (
        <CardDashboard
          titulo="Contratos a vencer"
          icone={<IconAssinaturaPendente className="h-[18px] w-[18px]" />}
          cor={COR_CONTRATOS}
          contagem={contratos.itens.length}
        >
          {contratos.itens.length === 0 ? (
            <Vazio mensagem="Nenhum contrato vencendo nos próximos 90 dias." />
          ) : (
            contratos.itens.map((c) => (
              <LinhaItem key={c.atletaId} href={`/atletas/${c.atletaId}`}>
                <span className="min-w-0 truncate text-neutral-700">{c.nomeCompleto}</span>
                <span className="shrink-0 text-xs text-neutral-400">{formatDataCurta(c.vigenciaFim)}</span>
              </LinhaItem>
            ))
          )}
        </CardDashboard>
      ) : null}

      {aniversariantes ? (
        <CardDashboard
          titulo="Aniversariantes do mês"
          icone={
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M8 4v2M16 4v2" />
              <path d="M4 10h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V10Z" />
              <path d="M4 14c1 1 2 1 3 0s2-1 3 0 2 1 3 0 2-1 3 0 2 1 3 0" />
            </svg>
          }
          cor={COR_ANIVERSARIO}
          contagem={aniversariantes.itens.length}
        >
          {aniversariantes.itens.length === 0 ? (
            <Vazio mensagem="Nenhum aniversariante este mês." />
          ) : (
            aniversariantes.itens.map((a) => (
              <LinhaItem
                key={`${a.origem}-${a.id}`}
                href={a.origem === "atleta" ? `/atletas/${a.id}` : `/comissao-tecnica/${a.id}`}
              >
                <span className="min-w-0 truncate text-neutral-700">{a.nomeCompleto}</span>
                <span className="shrink-0 text-xs text-neutral-400">{formatDataCurta(a.dataNascimento)}</span>
              </LinhaItem>
            ))
          )}
        </CardDashboard>
      ) : null}

      {alertas ? (
        <CardDashboard
          titulo="Alertas de prazo"
          icone={<IconAssinaturaPendente className="h-[18px] w-[18px]" />}
          cor={COR_ALERTAS}
          contagem={alertas.itens.length}
        >
          {alertas.itens.length === 0 ? (
            <Vazio mensagem="Nenhum prazo chegando nos próximos dias." />
          ) : (
            alertas.itens.map((a, i) => (
              <LinhaItem key={i} href={a.href}>
                <div className="min-w-0">
                  <p className="truncate text-neutral-700">{a.titulo}</p>
                  {a.subtitulo ? <p className="truncate text-xs text-neutral-400">{a.subtitulo}</p> : null}
                </div>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${CORES_URGENCIA[a.urgencia]}`}
                >
                  {a.diasRestantes === 0 ? "Hoje" : a.diasRestantes === 1 ? "Amanhã" : `${a.diasRestantes}d`}
                </span>
              </LinhaItem>
            ))
          )}
        </CardDashboard>
      ) : null}

      {atletasDm ? (
        <CardDashboard
          titulo="Acompanhamento no DM"
          icone={<IconDepartamentoMedico className="h-[18px] w-[18px]" />}
          cor={COR_DM}
          contagem={atletasDm.itens.length}
          href={atletasDm.href}
        >
          {atletasDm.itens.length === 0 ? (
            <Vazio mensagem="Nenhum atleta em acompanhamento no DM." />
          ) : (
            atletasDm.itens.map((a) => (
              <LinhaItem key={a.id}>
                <span className="min-w-0 truncate text-neutral-700">{a.nomeCompleto}</span>
                <span className="shrink-0 text-xs text-neutral-400">{a.categoriaLabel}</span>
              </LinhaItem>
            ))
          )}
        </CardDashboard>
      ) : null}

      {solicitacoes ? (
        <CardDashboard
          titulo="Solicitações pendentes"
          icone={<IconSolicitacoes className="h-[18px] w-[18px]" />}
          cor={COR_SOLICITACOES}
          contagem={solicitacoes.itens.length}
          href={solicitacoes.href}
        >
          {solicitacoes.itens.length === 0 ? (
            <Vazio mensagem="Nenhuma solicitação pendente." />
          ) : (
            solicitacoes.itens.map((s) => (
              <LinhaItem key={s.id}>
                <span className="min-w-0 truncate text-neutral-700">
                  Nº {String(s.numero).padStart(3, "0")} · {s.solicitante}
                </span>
                <span className="shrink-0 text-xs text-neutral-400">
                  {s.prazoSugerido ? formatDataCurta(s.prazoSugerido) : "sem prazo"}
                </span>
              </LinhaItem>
            ))
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
              <span className="shrink-0 text-xs text-neutral-400">
                {item.horarioInicio ? item.horarioInicio.slice(0, 5) : "—"}
              </span>
            </LinhaItem>
          ))
        )}
        <Link href={programacaoHoje.href} className="btn-secondary mt-1 self-start text-sm">
          Ver semana completa
        </Link>
      </CardDashboard>
    </div>
  );
}
