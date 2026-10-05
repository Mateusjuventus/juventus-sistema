"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ModalShell } from "@/components/programacao/modal";
import { AtletaAvatarCirculo } from "@/components/atleta-avatar";
import { corPrazoDemanda, type CorPrazoDemanda } from "@/lib/demandas/cor-prazo";
import { alternarConclusaoDemanda } from "@/app/minhas-demandas/actions";
import { buscarDemandasDaPessoa } from "@/app/demandas/actions";
import { hojeBrasilia } from "@/lib/data-brasil";
import type { DemandaRow } from "@/lib/supabase/types";

const COR_DOT: Record<CorPrazoDemanda, string> = {
  verde: "bg-emerald-500",
  laranja: "bg-orange-500",
  vermelho: "bg-red-500",
};

function formatData(data: string | null): string | null {
  if (!data) return null;
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}`;
}

/** A "bolinha" de check pedida pelo Mateus em 05/10 — concluída vira um círculo preenchido com um
 * check; pendente/em andamento fica um círculo vazio na cor de urgência do prazo (mesma régua de
 * `corPrazoDemanda`). Clicar alterna entre as duas (nunca volta pra "em andamento" — ver
 * `alternarConclusaoDemanda`). */
function DemandaCheckbox({
  concluida,
  cor,
  pending,
  onToggle,
}: {
  concluida: boolean;
  cor: CorPrazoDemanda | null;
  pending: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      aria-pressed={concluida}
      aria-label={concluida ? "Marcar como pendente" : "Marcar como concluída"}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        concluida
          ? "border-emerald-500 bg-emerald-500 text-white"
          : `bg-white hover:border-grena ${cor ? COR_DOT[cor].replace("bg-", "border-") : "border-neutral-300"}`
      } ${pending ? "opacity-50" : "cursor-pointer"}`}
    >
      {concluida ? (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : null}
    </button>
  );
}

function LinhaDemanda({
  demanda,
  hojeStr,
  onAlterado,
}: {
  demanda: DemandaRow;
  hojeStr: string;
  onAlterado: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const concluida = demanda.status === "concluido";
  const cor = corPrazoDemanda(demanda.prazo, demanda.status, hojeStr);
  const prazoFormatado = formatData(demanda.prazo);

  function alternar() {
    startTransition(async () => {
      await alternarConclusaoDemanda(demanda.id, !concluida);
      onAlterado();
    });
  }

  return (
    <div className={`flex items-center gap-3 rounded-md border border-linha px-3 py-2.5 ${pending ? "opacity-60" : ""}`}>
      <DemandaCheckbox concluida={concluida} cor={cor} pending={pending} onToggle={alternar} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${concluida ? "text-neutral-400 line-through" : "text-neutral-800"}`}>
          {demanda.titulo}
        </p>
        {demanda.descricao ? <p className="mt-0.5 truncate text-xs text-neutral-400">{demanda.descricao}</p> : null}
      </div>
      {concluida ? (
        <span className="shrink-0 text-xs text-neutral-400">Concluída {formatData(demanda.updated_at.slice(0, 10))}</span>
      ) : prazoFormatado ? (
        <span className={`shrink-0 text-xs ${cor === "vermelho" ? "font-semibold text-red-700" : "text-neutral-400"}`}>
          {cor === "vermelho" ? "Atrasada · " : "Prazo "}
          {prazoFormatado}
        </span>
      ) : null}
    </div>
  );
}

/**
 * "Tela intermediária" de uma pessoa acompanhada — modal aberto ao clicar num card em `/demandas`,
 * em vez de navegar pra uma página inteira (pedido do Mateus em 05/10: "não precisa abrir essa tela
 * inteira, abra aquela intermediária"). Mesmo padrão já usado em `HistoricoStatusModal`
 * (app/departamento-medico/fisioterapia/historico-status-modal.tsx): busca os dados sob demanda ao
 * abrir, com um link no rodapé pra tela completa (`/demandas/[id]`) pra quem quiser a URL
 * compartilhável. Mostra TODAS as demandas da pessoa, sem limite — Pendentes e Concluídas, com uma
 * "bolinha" de check em cada uma pra marcar/desmarcar concluída com um clique, e um filtro de dia
 * opcional (client-side, instantâneo — já tem tudo carregado) que vale pros dois grupos.
 */
export function PessoaDemandasModal({
  perfilId,
  nome,
  funcao,
  fotoUrl,
  onClose,
}: {
  perfilId: string;
  nome: string;
  funcao: string;
  fotoUrl: string | null;
  onClose: () => void;
}) {
  const [demandas, setDemandas] = useState<DemandaRow[] | null>(null);
  const [diaFiltro, setDiaFiltro] = useState("");
  const hojeStr = hojeBrasilia();

  function recarregar() {
    buscarDemandasDaPessoa(perfilId).then(setDemandas);
  }

  useEffect(() => {
    recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfilId]);

  const filtradas = (demandas ?? []).filter((d) => {
    if (!diaFiltro) return true;
    return d.status === "concluido" ? d.updated_at.slice(0, 10) === diaFiltro : d.prazo === diaFiltro;
  });
  const pendentes = filtradas
    .filter((d) => d.status !== "concluido")
    .sort((a, b) => (a.prazo ?? "9999-99-99").localeCompare(b.prazo ?? "9999-99-99"));
  const concluidas = filtradas
    .filter((d) => d.status === "concluido")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  return (
    <ModalShell
      titulo={nome}
      subtitulo={funcao}
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      footer={
        <Link href={`/demandas/${perfilId}`} className="text-sm font-medium text-grena hover:underline">
          Ver tela completa →
        </Link>
      }
    >
      <div className="flex items-center gap-3">
        <AtletaAvatarCirculo nome={nome} fotoUrl={fotoUrl} className="h-10 w-10" />
        <div className="flex items-center gap-2">
          <label htmlFor="pessoa-demandas-dia" className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Filtrar por dia
          </label>
          <input
            id="pessoa-demandas-dia"
            type="date"
            value={diaFiltro}
            onChange={(e) => setDiaFiltro(e.target.value)}
            className="field-input w-auto py-1 text-sm"
          />
          {diaFiltro ? (
            <button type="button" onClick={() => setDiaFiltro("")} className="text-sm font-medium text-grena hover:underline">
              Limpar
            </button>
          ) : null}
        </div>
      </div>

      {demandas === null ? (
        <p className="mt-5 text-sm text-neutral-400">Carregando...</p>
      ) : (
        <div className="mt-5 space-y-5">
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wide text-grena">Pendentes ({pendentes.length})</h4>
            {pendentes.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-400">
                {diaFiltro ? "Nenhuma com prazo nesse dia." : "Nenhuma demanda pendente. 🎉"}
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {pendentes.map((d) => (
                  <LinhaDemanda key={d.id} demanda={d} hojeStr={hojeStr} onAlterado={recarregar} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-400">Concluídas ({concluidas.length})</h4>
            {concluidas.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-400">
                {diaFiltro ? "Nenhuma concluída nesse dia." : "Nenhuma demanda concluída ainda."}
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {concluidas.map((d) => (
                  <LinhaDemanda key={d.id} demanda={d} hojeStr={hojeStr} onAlterado={recarregar} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </ModalShell>
  );
}
