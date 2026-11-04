"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { SelectField, TextField } from "@/components/fields";
import { CurrencyField } from "@/components/currency-field";
import { METRICA_GATILHO_OPTIONS } from "@/lib/validation/schemas";
import { ROTULO_SEM_COMPETICAO, type CompeticaoDisponivelAtleta } from "@/lib/futebol/estatisticas-atleta-query";

export interface GatilhoContratoFormState {
  error?: string;
  success?: boolean;
}

function AdicionarButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-secondary" disabled={pending}>
      {pending ? "Salvando..." : "Adicionar gatilho"}
    </button>
  );
}

/**
 * "+ Adicionar gatilho" (dentro do contrato vigente, em `ContratoSecao`) — ver docs/superpowers/
 * specs/2026-11-04-contrato-atleta-gatilhos-design.md. Mesmo padrão de `EvolucaoSalarialForm`: usa
 * `key` pra limpar os campos depois de um envio com sucesso, sem redirect.
 *
 * O checklist de Competições (agrupado por Temporada) + "incluir sem competição" repete o mesmo
 * markup/estilo de `FichaAtletaModal` (components/atletas/ficha-atleta-modal.tsx) — é o mesmo
 * "universo de jogos" usado em `buscarEstatisticasAtleta`. `limiar` troca de rótulo (%/contagem)
 * conforme a métrica escolhida, por isso o `useState` pra acompanhar a métrica selecionada.
 */
export function GatilhoContratoForm({
  action,
  contratoId,
  atletaId,
  competicoesDisponiveis,
  temJogosSemCompeticao,
}: {
  action: (prevState: GatilhoContratoFormState, formData: FormData) => Promise<GatilhoContratoFormState>;
  contratoId: string;
  atletaId: string;
  /** Competições formais disponíveis pro checklist — mesma lista de `buscarCompeticoesDisponiveisAtleta`
   * usada na Ficha do atleta, já ordenada por Temporada mais recente primeiro. */
  competicoesDisponiveis: CompeticaoDisponivelAtleta[];
  temJogosSemCompeticao: boolean;
}) {
  const [state, formAction] = useFormState(action, {});
  const [formKey, setFormKey] = useState(0);
  const [metrica, setMetrica] = useState("");
  const [competicaoIdsSelecionados, setCompeticaoIdsSelecionados] = useState<Set<string>>(new Set());
  const [semCompeticaoSelecionado, setSemCompeticaoSelecionado] = useState(false);

  useEffect(() => {
    if (state.success) {
      setFormKey((k) => k + 1);
      setMetrica("");
      setCompeticaoIdsSelecionados(new Set());
      setSemCompeticaoSelecionado(false);
    }
  }, [state]);

  function alternarCompeticao(competicaoId: string) {
    setCompeticaoIdsSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(competicaoId)) novo.delete(competicaoId);
      else novo.add(competicaoId);
      return novo;
    });
  }

  const metricaSelecionada = METRICA_GATILHO_OPTIONS.find((m) => m.value === metrica);
  const limiarLabel =
    metricaSelecionada?.tipo === "contagem" ? "Quantidade pra bater a meta" : "Percentual pra bater a meta (%)";

  const grupos: { temporadaId: string; temporadaNome: string; itens: CompeticaoDisponivelAtleta[] }[] = [];
  for (const c of competicoesDisponiveis) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.temporadaId === c.temporadaId) ultimo.itens.push(c);
    else grupos.push({ temporadaId: c.temporadaId, temporadaNome: c.temporadaNome, itens: [c] });
  }

  return (
    <div>
      <form key={formKey} action={formAction} className="flex flex-col gap-3 rounded-md border border-dashed border-neutral-300 p-3">
        <input type="hidden" name="contratoId" value={contratoId} />
        <input type="hidden" name="atletaId" value={atletaId} />

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1">
            <SelectField label="Métrica" name="metrica" required onChange={setMetrica}>
              <option value="">Selecione</option>
              {METRICA_GATILHO_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="min-w-[160px]">
            <TextField
              label={limiarLabel}
              name="limiar"
              type="number"
              min={0}
              max={metricaSelecionada?.tipo === "percentual" ? 100 : undefined}
              step="0.01"
              required
            />
          </div>
          <div className="min-w-[150px]">
            <CurrencyField label="Valor do bônus" name="valorBonus" required />
          </div>
          <AdicionarButton />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-grena-escuro">
            Competições que entram no cálculo
          </p>
          {competicoesDisponiveis.length === 0 && !temJogosSemCompeticao ? (
            <p className="text-xs text-neutral-400">
              Nenhum jogo com Convocação salva encontrado ainda — a lista de Competições aparece aqui quando houver.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {grupos.map((grupo) => (
                <div key={grupo.temporadaId}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{grupo.temporadaNome}</p>
                  <div className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {grupo.itens.map((c) => (
                      <label key={c.competicaoId} className="flex items-center gap-2 text-sm text-neutral-700">
                        <input
                          type="checkbox"
                          name="competicaoIds"
                          value={c.competicaoId}
                          checked={competicaoIdsSelecionados.has(c.competicaoId)}
                          onChange={() => alternarCompeticao(c.competicaoId)}
                          className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
                        />
                        {c.competicaoNome}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {temJogosSemCompeticao ? (
                <label className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    name="incluirSemCompeticao"
                    checked={semCompeticaoSelecionado}
                    onChange={() => setSemCompeticaoSelecionado((v) => !v)}
                    className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
                  />
                  {ROTULO_SEM_COMPETICAO}
                </label>
              ) : null}
            </div>
          )}
        </div>
      </form>
      {state.error ? <p className="field-error">{state.error}</p> : null}
    </div>
  );
}
