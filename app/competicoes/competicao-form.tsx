"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { CompeticaoRow, TemporadaRow } from "@/lib/supabase/types";
import { CriteriosDesempateField } from "./criterios-desempate-field";
import type { CompeticaoFormState } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Salvando..." : label}
    </button>
  );
}

/**
 * Formulário de competição (criar/editar). Campos exatamente como a spec definiu: UM nome só
 * (sem "nome oficial", sem "tipo de competição"), temporada, federação, categoria, datas, status,
 * regulamento (PDF) e observações — mais as regras do motor disciplinar, que têm padrão (3
 * amarelos → 1 jogo; vermelho → 1 jogo) e ficam num bloco discreto no fim.
 */
export function CompeticaoForm({
  temporadas,
  competicao,
  action,
  submitLabel,
}: {
  temporadas: TemporadaRow[];
  competicao?: CompeticaoRow;
  action: (prevState: CompeticaoFormState, formData: FormData) => Promise<CompeticaoFormState>;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, {} as CompeticaoFormState);

  return (
    <form action={formAction} className="card mt-6 space-y-4 p-6">
      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div>
        <label htmlFor="nome" className="field-label">
          Nome da competição
        </label>
        <input
          id="nome"
          name="nome"
          className="field-input"
          defaultValue={competicao?.nome ?? ""}
          placeholder="Ex.: Copa Paulista"
          required
        />
        <p className="mt-1 text-xs text-neutral-400">
          A competição é identificada simplesmente pelo nome.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="temporadaId" className="field-label">
            Temporada
          </label>
          <select
            id="temporadaId"
            name="temporadaId"
            className="field-input"
            defaultValue={competicao?.temporada_id ?? temporadas[0]?.id ?? ""}
            required
          >
            {temporadas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="federacao" className="field-label">
            Federação / Organização
          </label>
          <input
            id="federacao"
            name="federacao"
            className="field-input"
            defaultValue={competicao?.federacao ?? ""}
            placeholder="Ex.: FPF — Federação Paulista de Futebol"
          />
        </div>
        <div>
          <label htmlFor="categoria" className="field-label">
            Categoria
          </label>
          <input
            id="categoria"
            name="categoria"
            className="field-input"
            defaultValue={competicao?.categoria ?? "Profissional"}
            placeholder="Ex.: Profissional, Sub-20..."
          />
        </div>
        <div>
          <label htmlFor="status" className="field-label">
            Status
          </label>
          <select id="status" name="status" className="field-input" defaultValue={competicao?.status ?? "planejada"}>
            <option value="planejada">Planejada</option>
            <option value="em_andamento">Em andamento</option>
            <option value="encerrada">Encerrada</option>
          </select>
        </div>
        <div>
          <label htmlFor="dataInicio" className="field-label">
            Data de início
          </label>
          <input
            id="dataInicio"
            name="dataInicio"
            type="date"
            className="field-input"
            defaultValue={competicao?.data_inicio ?? ""}
          />
        </div>
        <div>
          <label htmlFor="dataTermino" className="field-label">
            Data de término
          </label>
          <input
            id="dataTermino"
            name="dataTermino"
            type="date"
            className="field-input"
            defaultValue={competicao?.data_termino ?? ""}
          />
        </div>
      </div>

      <div>
        <label htmlFor="regulamento" className="field-label">
          Regulamento (PDF)
        </label>
        <input id="regulamento" name="regulamento" type="file" accept="application/pdf" className="field-input" />
        {competicao?.regulamento_path ? (
          <p className="mt-1 text-xs text-neutral-400">
            Já existe um regulamento enviado — escolher um arquivo novo substitui o atual.
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="observacoes" className="field-label">
          Observações
        </label>
        <textarea
          id="observacoes"
          name="observacoes"
          rows={3}
          className="field-input"
          defaultValue={competicao?.observacoes ?? ""}
        />
      </div>

      <fieldset className="rounded-md border border-linha p-4">
        <legend className="px-1 text-sm font-semibold text-neutral-700">
          Regras disciplinares da competição
        </legend>
        <p className="mb-3 text-xs text-neutral-400">
          Usadas pelo motor de suspensões — os cartões vêm sempre das súmulas dos jogos vinculados.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="regraAmarelos" className="field-label">
              Amarelos p/ suspensão
            </label>
            <input
              id="regraAmarelos"
              name="regraAmarelos"
              type="number"
              min={1}
              className="field-input"
              defaultValue={competicao?.regra_amarelos_suspensao ?? 3}
            />
          </div>
          <div>
            <label htmlFor="regraJogosAmarelos" className="field-label">
              Jogos de suspensão (amarelos)
            </label>
            <input
              id="regraJogosAmarelos"
              name="regraJogosAmarelos"
              type="number"
              min={1}
              className="field-input"
              defaultValue={competicao?.regra_jogos_suspensao_amarelos ?? 1}
            />
          </div>
          <div>
            <label htmlFor="regraJogosVermelho" className="field-label">
              Jogos de suspensão (vermelho)
            </label>
            <input
              id="regraJogosVermelho"
              name="regraJogosVermelho"
              type="number"
              min={1}
              className="field-input"
              defaultValue={competicao?.regra_jogos_suspensao_vermelho ?? 1}
            />
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="regraObservacoes" className="field-label">
            Texto do regulamento (referência)
          </label>
          <textarea
            id="regraObservacoes"
            name="regraObservacoes"
            rows={5}
            className="field-input font-mono text-xs"
            placeholder="Cole aqui o artigo do regulamento que embasa essas regras (ex.: Art. 60 da Copa Paulista)…"
            defaultValue={competicao?.regra_observacoes ?? ""}
          />
          <p className="mt-1 text-xs text-neutral-400">
            Só registro para consulta — o motor usa os números acima. O zeramento de amarelos ao fim de uma
            fase é marcado fase a fase, na aba Fases e Grupos.
          </p>
        </div>
      </fieldset>

      <fieldset className="rounded-md border border-linha p-4">
        <legend className="px-1 text-sm font-semibold text-neutral-700">Critérios de desempate</legend>
        <p className="mb-3 text-xs text-neutral-400">
          Aplicados sucessivamente quando duas equipes empatam em pontos, na ordem abaixo (na Copa Paulista
          é o Art. 17 — cada competição tem os seus). Uma fase pode ter ordem própria, na aba Fases e Grupos.
        </p>
        <CriteriosDesempateField valorInicial={competicao?.criterios_desempate ?? null} />
      </fieldset>

      <div className="flex justify-end gap-2">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
