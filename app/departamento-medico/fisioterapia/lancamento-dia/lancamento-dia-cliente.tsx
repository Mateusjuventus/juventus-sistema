"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { AtletaCard } from "@/components/atletas/atleta-card";
import { ModalShell } from "@/components/programacao/modal";
import { SelectField, TextAreaField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import {
  FISIOTERAPIA_STATUS_DIA_COR,
  FISIOTERAPIA_STATUS_DIA_LABEL,
  FISIOTERAPIA_STATUS_DIA_OPTIONS,
} from "@/lib/futebol/fisioterapia";
import { nomeExibido } from "@/lib/futebol/nome-atleta";
import { formatDataBr } from "@/lib/pdf/logistica-shared";
import type { FisioterapiaAtendimentoRow } from "@/lib/supabase/types";
import { atualizarAtendimento, registrarAtendimento, type FisioterapiaFormState } from "../[atletaId]/actions";
import type { LancamentoDiaAtletaItem } from "./page";

const initialState: FisioterapiaFormState = {};

function Feedback({ state }: { state: FisioterapiaFormState }) {
  if (state.error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  return null;
}

/** Formulário do modal "Lançar/Editar atendimento do dia" — mesmos campos de `NovoAtendimentoForm`/
 * `AtendimentoItem` (ficha do atleta), reaproveitando as MESMAS Server Actions (ver spec, seção 2:
 * nenhuma Server Action nova). A data vem fixa (campo oculto) — é a data escolhida no topo da tela,
 * não um campo editável aqui. */
function LancamentoForm({
  atletaId,
  data,
  atendimentoExistente,
  lesoesOpcoes,
  onClose,
}: {
  atletaId: string;
  data: string;
  atendimentoExistente: FisioterapiaAtendimentoRow | null;
  lesoesOpcoes: { id: string; descricao: string }[];
  onClose: () => void;
}) {
  const action = atendimentoExistente ? atualizarAtendimento : registrarAtendimento;
  const [state, formAction] = useFormState(action, initialState);

  useEffect(() => {
    if (state.success) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="atletaId" value={atletaId} />
      <input type="hidden" name="data" value={data} />
      {atendimentoExistente ? <input type="hidden" name="atendimentoId" value={atendimentoExistente.id} /> : null}
      {lesoesOpcoes.length > 0 ? (
        <SelectField label="Ligar a uma lesão em andamento (opcional)" name="lesaoId" defaultValue={atendimentoExistente?.lesao_id ?? ""}>
          <option value="">Sessão solta (sem lesão vinculada)</option>
          {lesoesOpcoes.map((l) => (
            <option key={l.id} value={l.id}>
              {l.descricao}
            </option>
          ))}
        </SelectField>
      ) : null}
      <SelectField label="Status do dia (opcional)" name="statusDia" defaultValue={atendimentoExistente?.status_dia ?? ""}>
        <option value="">Sem status</option>
        {FISIOTERAPIA_STATUS_DIA_OPTIONS.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </SelectField>
      <TextAreaField
        label="O que foi feito"
        name="descricao"
        defaultValue={atendimentoExistente?.descricao ?? ""}
        error={state.fieldErrors?.descricao}
        required
        rows={4}
      />
      <Feedback state={state} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary btn-sm">
          Cancelar
        </button>
        <SubmitButton label="Salvar" pendingLabel="Salvando..." className="btn-primary btn-sm" />
      </div>
    </form>
  );
}

/**
 * Busca + grade de cards pra lançar atendimentos do dia, e a lista "Lançados nessa data" — ver
 * docs/superpowers/specs/2026-10-07-relatorio-dia-fisioterapia-design.md, seção 2. Quem não pode
 * editar não vê a grade de lançamento (não tem sentido sem poder salvar nada), só a lista e o botão
 * de PDF, que já ficam no `page.tsx`/aqui embaixo independente de `podeEditar`.
 */
export function LancamentoDiaCliente({
  atletas,
  atendimentosHoje,
  data,
  podeEditar,
}: {
  atletas: LancamentoDiaAtletaItem[];
  atendimentosHoje: FisioterapiaAtendimentoRow[];
  data: string;
  podeEditar: boolean;
}) {
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<LancamentoDiaAtletaItem | null>(null);
  const buscaNormalizada = busca.trim().toLowerCase();

  const atendimentoPorAtleta = useMemo(() => new Map(atendimentosHoje.map((a) => [a.atleta_id, a])), [atendimentosHoje]);

  const atletasFiltrados = useMemo(
    () =>
      buscaNormalizada
        ? atletas.filter((a) => nomeExibido({ apelido: a.apelido, nome_completo: a.nome }).toLowerCase().includes(buscaNormalizada))
        : atletas,
    [atletas, buscaNormalizada],
  );

  const lancados = useMemo(
    () =>
      atletas
        .filter((a) => atendimentoPorAtleta.has(a.id))
        .map((a) => ({ atleta: a, atendimento: atendimentoPorAtleta.get(a.id)! }))
        .sort((a, b) =>
          nomeExibido({ apelido: a.atleta.apelido, nome_completo: a.atleta.nome }).localeCompare(
            nomeExibido({ apelido: b.atleta.apelido, nome_completo: b.atleta.nome }),
            "pt-BR",
          ),
        ),
    [atletas, atendimentoPorAtleta],
  );

  return (
    <div className="space-y-6">
      {podeEditar ? (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-grena">Lançar atendimento</h2>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar atleta pelo nome..."
            className="field-input mt-2 max-w-sm"
          />
          {atletasFiltrados.length === 0 ? (
            <p className="mt-4 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">Nenhum atleta encontrado.</p>
          ) : (
            <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] gap-2">
              {atletasFiltrados.map((atleta) => (
                <AtletaCard
                  key={atleta.id}
                  atleta={atleta}
                  as="div"
                  mostrarCpf={false}
                  mostrarContrato={false}
                  aoClicarCabecalho={() => setSelecionado(atleta)}
                  indicador={
                    atendimentoPorAtleta.has(atleta.id) ? (
                      <span className="block bg-emerald-50 py-0.5 text-center text-[10px] font-semibold text-emerald-700">
                        ✓ Lançado hoje
                      </span>
                    ) : undefined
                  }
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wide text-grena">Lançados em {formatDataBr(data)}</h2>
        {lancados.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">Nenhum atendimento lançado nessa data ainda.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {lancados.map(({ atleta, atendimento }) => (
              <li key={atleta.id} className="card p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-neutral-800">
                    {nomeExibido({ apelido: atleta.apelido, nome_completo: atleta.nome })}
                  </p>
                  {atendimento.status_dia ? (
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                      style={{ backgroundColor: FISIOTERAPIA_STATUS_DIA_COR[atendimento.status_dia] }}
                    >
                      {FISIOTERAPIA_STATUS_DIA_LABEL[atendimento.status_dia]}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-neutral-600">{atendimento.descricao}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selecionado ? (
        <ModalShell
          titulo={atendimentoPorAtleta.has(selecionado.id) ? "Editar atendimento do dia" : "Lançar atendimento do dia"}
          subtitulo={`${nomeExibido({ apelido: selecionado.apelido, nome_completo: selecionado.nome })} · ${formatDataBr(data)}`}
          onClose={() => setSelecionado(null)}
        >
          <LancamentoForm
            atletaId={selecionado.id}
            data={data}
            atendimentoExistente={atendimentoPorAtleta.get(selecionado.id) ?? null}
            lesoesOpcoes={selecionado.lesoesOpcoes}
            onClose={() => setSelecionado(null)}
          />
        </ModalShell>
      ) : null}
    </div>
  );
}
