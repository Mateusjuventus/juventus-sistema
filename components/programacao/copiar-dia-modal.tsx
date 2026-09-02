"use client";

import { useState, useTransition } from "react";
import { ModalShell } from "./modal";
import { copiarDiaProgramacao } from "@/lib/programacao/actions";
import { formatDataCurta } from "@/lib/programacao/microciclo-texto";
import type { CategoriaBase } from "@/lib/auth/categorias-base";

const DIA_SEMANA_COMPLETO_MIN = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function diaSemanaCompletoMinusculo(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return DIA_SEMANA_COMPLETO_MIN[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()];
}

/**
 * Modal do "Copiar Dia" (ver docs/superpowers/specs/2026-09-02-programacao-copiar-dia-layout-geral-
 * design.md, Parte 1) — dia de origem fixo (a coluna em que o botão foi clicado), datas de destino
 * livres, de qualquer semana. Não existe hoje nenhum componente de mini-calendário/multi-seleção de
 * datas no projeto, então as datas de destino são uma lista de `<input type="date">` controlados,
 * adicionados/removidos dinamicamente — `TextField` não serve aqui (é `defaultValue`/não-controlado
 * e assume um campo por `name`).
 *
 * Chama `copiarDiaProgramacao` direto via `useTransition` (não `useFormState`/`<form action>`, ver
 * o comentário do próprio `lib/programacao/actions.ts`) — fecha o modal explicitamente no sucesso.
 */
export function CopiarDiaModal({
  categoria,
  dataOrigem,
  onClose,
}: {
  categoria: CategoriaBase;
  dataOrigem: string;
  onClose: () => void;
}) {
  const [datas, setDatas] = useState<string[]>([""]);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function atualizarData(i: number, valor: string) {
    setDatas((atual) => atual.map((d, idx) => (idx === i ? valor : d)));
  }
  function removerData(i: number) {
    setDatas((atual) => atual.filter((_, idx) => idx !== i));
  }
  function adicionarData() {
    setDatas((atual) => [...atual, ""]);
  }

  function confirmar() {
    setErro(null);
    setFieldErrors({});
    const datasValidas = datas.map((d) => d.trim()).filter(Boolean);
    startTransition(async () => {
      const resultado = await copiarDiaProgramacao(categoria, dataOrigem, datasValidas);
      if (resultado.error) {
        setErro(resultado.error);
        return;
      }
      if (resultado.fieldErrors) {
        setFieldErrors(resultado.fieldErrors);
        return;
      }
      onClose();
    });
  }

  return (
    <ModalShell
      titulo={`Copiar ${diaSemanaCompletoMinusculo(dataOrigem)}, ${formatDataCurta(dataOrigem)}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary" disabled={pending}>
            Cancelar
          </button>
          <button type="button" onClick={confirmar} className="btn-primary" disabled={pending}>
            {pending ? "Copiando..." : "Copiar"}
          </button>
        </>
      }
    >
      <p className="mb-4 text-sm text-neutral-500">
        Todas as atividades já lançadas nas datas de destino serão substituídas pelas atividades
        deste dia. Jogos não são copiados.
      </p>

      <p className="field-label">Datas de destino</p>
      <div className="space-y-2">
        {datas.map((valor, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="date"
              value={valor}
              onChange={(e) => atualizarData(i, e.target.value)}
              className="field-input"
            />
            {datas.length > 1 ? (
              <button
                type="button"
                onClick={() => removerData(i)}
                aria-label="Remover data"
                className="text-lg text-neutral-400 hover:text-neutral-600"
              >
                ×
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={adicionarData}
        className="mt-2 text-sm font-medium text-grena hover:text-grena-escuro"
      >
        + Adicionar data
      </button>

      {fieldErrors.datasDestino ? <p className="field-error mt-2">{fieldErrors.datasDestino}</p> : null}
      {erro ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p> : null}
    </ModalShell>
  );
}
