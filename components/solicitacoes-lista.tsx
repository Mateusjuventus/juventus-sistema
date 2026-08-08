"use client";

import { useState } from "react";
import Link from "next/link";
import { DeleteButton } from "@/components/delete-button";
import { SolicitacaoStatusSelect } from "@/components/solicitacao-status";
import { SOLICITACAO_TIPOS, SOLICITACAO_STATUS } from "@/lib/validation/schemas";
import type { SolicitacaoStatus, SolicitacaoTipo } from "@/lib/supabase/types";

/** Só os campos que a listagem precisa — `SolicitacaoRow` (Profissional) e `SolicitacaoBaseRow`
 * (Base) têm ambos esse formato (e mais), então os dois passam direto aqui sem conversão. */
export interface SolicitacaoListaItem {
  id: string;
  numero: number;
  tipo: SolicitacaoTipo;
  data_solicitacao: string;
  solicitante: string;
  descricao_necessidade: string | null;
  prazo_sugerido: string | null;
  valor: number | null;
  status: SolicitacaoStatus;
}

function formatData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatMoeda(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function IconSeta({ aberto }: { aberto: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={`h-4 w-4 shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CardSolicitacao({
  item,
  hrefBase,
  updateStatusAction,
  duplicarAction,
  deletarAction,
}: {
  item: SolicitacaoListaItem;
  hrefBase: string;
  updateStatusAction: (formData: FormData) => Promise<void>;
  duplicarAction: (formData: FormData) => Promise<void>;
  deletarAction: (formData: FormData) => Promise<void>;
}) {
  const tipoLabel = SOLICITACAO_TIPOS.find((t) => t.value === item.tipo)?.label ?? item.tipo;
  const prazoFormatado = item.prazo_sugerido ? formatData(item.prazo_sugerido) : null;

  return (
    <div className="card flex flex-wrap items-center gap-3 p-4">
      <div className="min-w-[220px] flex-1">
        <p className="font-medium text-neutral-800">
          <span className="text-neutral-400">Nº {String(item.numero).padStart(3, "0")}</span> · {tipoLabel} ·{" "}
          {item.solicitante}
        </p>
        {item.descricao_necessidade ? (
          <p className="mt-0.5 line-clamp-1 text-sm text-neutral-500">{item.descricao_necessidade}</p>
        ) : null}
      </div>
      <div className="flex flex-col items-end text-sm text-neutral-500">
        <span>Data: {formatData(item.data_solicitacao)}</span>
        {prazoFormatado ? <span>Prazo sugerido: {prazoFormatado}</span> : null}
        {item.valor !== null ? <span>{formatMoeda(item.valor)}</span> : null}
      </div>
      <SolicitacaoStatusSelect id={item.id} status={item.status} action={updateStatusAction} />
      <div className="flex gap-2">
        <Link href={`${hrefBase}/${item.id}`} className="btn-secondary">
          Ver / Editar
        </Link>
        <a href={`${hrefBase}/${item.id}/pdf`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
          PDF
        </a>
        <form action={duplicarAction}>
          <input type="hidden" name="id" value={item.id} />
          <button type="submit" className="btn-secondary">
            Duplicar
          </button>
        </form>
        <DeleteButton action={deletarAction} id={item.id} entityLabel="solicitação" />
      </div>
    </div>
  );
}

/** Subgrupo de um status por tipo (Compra/Pagamento/Reembolso/...), recolhido por padrão — clicar
 * no cabeçalho abre a lista daquele tipo. Só usado dentro do grupo "Concluída" (ver
 * `SolicitacoesLista`): é onde a lista costuma crescer bastante (concluída acumula com o tempo, ao
 * contrário de Pendente/Aprovada/Recusada, que tendem a esvaziar), então agrupar por tipo com
 * colapso ajuda a achar o que precisa sem rolar uma lista enorme. */
function SubgrupoTipo({
  tipoLabel,
  itens,
  hrefBase,
  updateStatusAction,
  duplicarAction,
  deletarAction,
}: {
  tipoLabel: string;
  itens: SolicitacaoListaItem[];
  hrefBase: string;
  updateStatusAction: (formData: FormData) => Promise<void>;
  duplicarAction: (formData: FormData) => Promise<void>;
  deletarAction: (formData: FormData) => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-linha bg-white">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-neutral-50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-grena-escuro">
          <IconSeta aberto={aberto} />
          {tipoLabel}
        </span>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-500">
          {itens.length}
        </span>
      </button>
      {aberto ? (
        <div className="space-y-3 border-t border-linha p-3">
          {itens.map((item) => (
            <CardSolicitacao
              key={item.id}
              item={item}
              hrefBase={hrefBase}
              updateStatusAction={updateStatusAction}
              duplicarAction={duplicarAction}
              deletarAction={deletarAction}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Lista de solicitações agrupada por status (Pendente/Aprovada/Recusada/Concluída), na ordem
 * natural do fluxo. Dentro do grupo "Concluída", ainda subagrupa por tipo (Compra/Pagamento/...)
 * com colapso — os outros status ficam como lista simples (não costumam acumular o suficiente pra
 * precisar disso). Compartilhado entre `app/solicitacoes/page.tsx` (Futebol Profissional) e
 * `app/base/solicitacoes/page.tsx` (Futebol de Base), que só diferem na tabela/rota — por isso as
 * Server Actions entram como prop (única forma permitida de uma função cruzar de Server pra Client
 * Component) em vez deste componente importá-las direto.
 */
export function SolicitacoesLista({
  itens,
  hrefBase,
  updateStatusAction,
  duplicarAction,
  deletarAction,
}: {
  itens: SolicitacaoListaItem[];
  hrefBase: string;
  updateStatusAction: (formData: FormData) => Promise<void>;
  duplicarAction: (formData: FormData) => Promise<void>;
  deletarAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="space-y-6">
      {SOLICITACAO_STATUS.map((statusInfo) => {
        const doGrupo = itens.filter((s) => s.status === statusInfo.value);
        if (doGrupo.length === 0) return null;

        return (
          <div key={statusInfo.value}>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {statusInfo.label}
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-500">
                {doGrupo.length}
              </span>
            </h2>

            {statusInfo.value === "concluida" ? (
              <div className="space-y-2">
                {SOLICITACAO_TIPOS.map((tipoInfo) => {
                  const doTipo = doGrupo.filter((s) => s.tipo === tipoInfo.value);
                  if (doTipo.length === 0) return null;
                  return (
                    <SubgrupoTipo
                      key={tipoInfo.value}
                      tipoLabel={tipoInfo.label}
                      itens={doTipo}
                      hrefBase={hrefBase}
                      updateStatusAction={updateStatusAction}
                      duplicarAction={duplicarAction}
                      deletarAction={deletarAction}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {doGrupo.map((item) => (
                  <CardSolicitacao
                    key={item.id}
                    item={item}
                    hrefBase={hrefBase}
                    updateStatusAction={updateStatusAction}
                    duplicarAction={duplicarAction}
                    deletarAction={deletarAction}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
