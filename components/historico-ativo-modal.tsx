"use client";

import { useEffect, useState } from "react";
import { ModalShell } from "@/components/programacao/modal";
import { MOTIVO_DESATIVACAO_ATLETA_OPTIONS } from "@/lib/futebol/ativo-historico";
import { calcularLinhaDoTempoAtivo, type LinhaAtivoHistoricoComDias } from "@/lib/futebol/ativo-historico";
import { formatDataBr } from "@/lib/pdf/logistica-shared";
import { hojeBrasilia } from "@/lib/data-brasil";
import { buscarHistoricoAtivo } from "@/app/atletas/actions";

const MOTIVO_LABEL: Record<string, string> = Object.fromEntries(
  MOTIVO_DESATIVACAO_ATLETA_OPTIONS.map((opcao) => [opcao.value, opcao.label]),
);

function rotuloMotivo(motivo: string | null): string {
  if (!motivo) return "—";
  return MOTIVO_LABEL[motivo] ?? motivo;
}

function LinhaHistoricoAtivo({ linha }: { linha: LinhaAtivoHistoricoComDias }) {
  return (
    <div className="rounded-md border border-linha px-3 py-2">
      <p className="text-sm font-semibold text-grena-escuro">
        {linha.ativo ? "Ativo" : "Inativo"}
        <span className="ml-2 font-normal text-neutral-500">
          {formatDataBr(linha.data)} · {linha.dias} {linha.dias === 1 ? "dia" : "dias"}
        </span>
      </p>
      {!linha.ativo ? <p className="text-xs text-neutral-600">Motivo: {rotuloMotivo(linha.motivo)}</p> : null}
      {linha.observacao ? <p className="text-xs text-neutral-600">Observação: {linha.observacao}</p> : null}
      <p className="truncate text-xs text-neutral-400">Registrado por {linha.criado_por_nome ?? "—"}</p>
    </div>
  );
}

/**
 * Modal "Histórico de desativações" (ver docs/superpowers/specs/2026-11-04-atletas-desativacao-
 * transicao-pagamento-design.md) — mesmo padrão de `HistoricoStatusModal`, mas só leitura (sem
 * edição inline: desativar/reativar já cria uma linha nova pelo próprio `AtletaAtivoButton`).
 */
export function HistoricoAtivoModal({ atletaId, nome, onClose }: { atletaId: string; nome: string; onClose: () => void }) {
  const [linhas, setLinhas] = useState<LinhaAtivoHistoricoComDias[] | null>(null);

  useEffect(() => {
    buscarHistoricoAtivo(atletaId).then((historico) => {
      setLinhas(calcularLinhaDoTempoAtivo(historico, hojeBrasilia()));
    });
  }, [atletaId]);

  return (
    <ModalShell titulo="Histórico de desativações" subtitulo={nome} onClose={onClose}>
      <div className="space-y-2">
        {linhas === null ? (
          <p className="text-sm text-neutral-400">Carregando...</p>
        ) : linhas.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhuma desativação/reativação registrada ainda.</p>
        ) : (
          linhas.map((linha) => <LinhaHistoricoAtivo key={linha.id} linha={linha} />)
        )}
      </div>
    </ModalShell>
  );
}

/** Botão "Ver histórico de desativações" + o modal — auto-contido (abre/fecha o próprio estado),
 * já que a página "Ver atleta" só tem um atleta por vez (diferente da listagem de Fisioterapia,
 * que controla a seleção pelo card clicado). */
export function HistoricoAtivoButton({ atletaId, nome }: { atletaId: string; nome: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="text-sm font-medium text-grena hover:underline">
        Ver histórico de desativações
      </button>
      {aberto ? <HistoricoAtivoModal atletaId={atletaId} nome={nome} onClose={() => setAberto(false)} /> : null}
    </>
  );
}
