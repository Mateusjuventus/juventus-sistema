"use client";

import Link from "next/link";
import { CaptacaoStatusSelect } from "./captacao-status-select";
import { CAPTACAO_STATUS_OPTIONS } from "@/lib/futebol/captacao";
import { categoriaBaseLabel } from "@/lib/auth/categorias-base";
import type { CaptacaoBaseRow } from "@/lib/supabase/types";

function formatDataBr(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function CardCaptacao({
  candidato,
  updateStatusAction,
}: {
  candidato: CaptacaoBaseRow;
  updateStatusAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="card flex flex-wrap items-center gap-3 p-4">
      <div className="min-w-[220px] flex-1">
        <p className="font-medium text-neutral-800">
          <span className="text-neutral-400">Nº {candidato.numero}</span> ·{" "}
          <Link href={`/base/captacao/${candidato.id}`} className="text-grena hover:underline">
            {candidato.nome_completo}
          </Link>
        </p>
        <p className="mt-0.5 text-sm text-neutral-500">
          Nascimento {formatDataBr(candidato.data_nascimento)} · {candidato.posicao ?? "posição não informada"}
          {candidato.categoria ? ` · ${categoriaBaseLabel(candidato.categoria)}` : ""}
        </p>
        <p className="text-sm text-neutral-500">
          {candidato.cidade ? `${candidato.cidade}${candidato.uf ? `/${candidato.uf}` : ""}` : "Cidade não informada"}
          {candidato.indicacao ? ` · Indicação: ${candidato.indicacao}` : ""}
        </p>
      </div>
      <div className="flex flex-col items-end text-sm text-neutral-500">
        <span>Início: {formatDataBr(candidato.data_inicio)}</span>
        {candidato.data_termino ? <span>Término: {formatDataBr(candidato.data_termino)}</span> : null}
        {candidato.deseja_alojamento ? (
          <span className="font-medium text-amber-700">Precisa de alojamento</span>
        ) : null}
      </div>
      <CaptacaoStatusSelect id={candidato.id} status={candidato.status} action={updateStatusAction} />
      <Link href={`/base/captacao/${candidato.id}`} className="btn-secondary">
        Ver / Editar
      </Link>
    </div>
  );
}

/**
 * Lista da Captação/Avaliação agrupada por status (Em avaliação/Aprovado/Dispensado/Não
 * compareceu), na ordem do funil — mesmo padrão de `SolicitacoesLista`
 * (components/solicitacoes-lista.tsx), pedido de 19/08 ("igual vc faz hoje na solicitações"): a
 * troca de status é feita direto no `<select>` de cada cartão (`CaptacaoStatusSelect`), e o
 * candidato se move sozinho pro grupo do novo status assim que a página revalida. "Inscrição
 * enviada" nunca aparece aqui — fica só na fila de Aprovações (`/base/captacao/aprovacoes`) até ser
 * decidida.
 */
export function CaptacaoLista({
  candidatos,
  updateStatusAction,
}: {
  candidatos: CaptacaoBaseRow[];
  updateStatusAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="space-y-6">
      {CAPTACAO_STATUS_OPTIONS.map((statusInfo) => {
        const doGrupo = candidatos.filter((c) => c.status === statusInfo.value);
        if (doGrupo.length === 0) return null;

        return (
          <div key={statusInfo.value}>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {statusInfo.label}
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-500">
                {doGrupo.length}
              </span>
            </h2>
            <div className="space-y-3">
              {doGrupo.map((candidato) => (
                <CardCaptacao key={candidato.id} candidato={candidato} updateStatusAction={updateStatusAction} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
