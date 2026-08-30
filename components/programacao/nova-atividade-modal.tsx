"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { ModalShell } from "./modal";
import { useFecharAoSalvar } from "./use-fechar-ao-salvar";
import { SubmitButton } from "@/components/submit-button";
import { TextField, SelectField } from "@/components/fields";
import { criarAtividade, criarAtividadeDeJogo, type ProgramacaoFormState } from "@/lib/programacao/actions";
import { PROGRAMACAO_ATIVIDADE_TIPO_OPTIONS } from "@/lib/validation/schemas";
import type { JogoResumoAtividade } from "@/lib/programacao/queries";
import type { CategoriaBase } from "@/lib/auth/categorias-base";

const ESTADO_INICIAL: ProgramacaoFormState = {};

function formatJogoOpcao(jogo: JogoResumoAtividade): string {
  const [, mes, dia] = jogo.data_jogo.split("-");
  const lado = jogo.mandante ? "casa" : "fora";
  return `${dia}/${mes} — ${jogo.mandante ? "Juventus" : jogo.adversario_nome} × ${jogo.mandante ? jogo.adversario_nome : "Juventus"} (${lado})`;
}

/** Formulário pra qualquer tipo que não seja Jogo Oficial/Jogo Treino. */
function FormularioAtividadeGeral({
  categoria,
  tipoInicial,
  onDone,
}: {
  categoria: CategoriaBase;
  tipoInicial: string;
  onDone: () => void;
}) {
  const [state, formAction] = useFormState(criarAtividade, ESTADO_INICIAL);
  useFecharAoSalvar(state, onDone);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="categoria" value={categoria} />
      <TextField label="Nome da atividade" name="nome" required error={state.fieldErrors?.nome} placeholder="Ex.: Treino Técnico/Tático" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="Tipo de atividade" name="tipo" defaultValue={tipoInicial} error={state.fieldErrors?.tipo}>
          {PROGRAMACAO_ATIVIDADE_TIPO_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectField>
        <TextField label="Data" name="data" type="date" required error={state.fieldErrors?.data} />
        <TextField label="Início" name="horarioInicio" type="time" required error={state.fieldErrors?.horarioInicio} />
        <TextField label="Término" name="horarioTermino" type="time" error={state.fieldErrors?.horarioTermino} />
      </div>
      <TextField
        label="Local"
        name="local"
        error={state.fieldErrors?.local}
        placeholder="Ex.: CT Juventus, Sede Social, Rua Javari..."
      />
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onDone} className="btn-secondary">
          Cancelar
        </button>
        <SubmitButton label="Salvar atividade" pendingLabel="Salvando..." />
      </div>
    </form>
  );
}

/** Formulário quando o tipo é Jogo Oficial/Jogo Treino — troca horário/local por um jogo já
 * cadastrado (ver spec, "Atividade de jogo não duplica dado"). */
function FormularioAtividadeDeJogo({
  categoria,
  tipo,
  jogos,
  onDone,
}: {
  categoria: CategoriaBase;
  tipo: "jogo_oficial" | "jogo_treino";
  jogos: JogoResumoAtividade[];
  onDone: () => void;
}) {
  const [state, formAction] = useFormState(criarAtividadeDeJogo, ESTADO_INICIAL);
  useFecharAoSalvar(state, onDone);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="categoria" value={categoria} />
      <input type="hidden" name="tipo" value={tipo} />
      {jogos.length === 0 ? (
        <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
          Nenhum jogo cadastrado nesta categoria ainda. Cadastre o jogo em Jogos antes de colocá-lo na
          programação.
        </p>
      ) : (
        <SelectField label="Jogo" name="jogoId" required error={state.fieldErrors?.jogoId}>
          <option value="">Selecione o jogo</option>
          {jogos.map((jogo) => (
            <option key={jogo.id} value={jogo.id}>
              {formatJogoOpcao(jogo)}
            </option>
          ))}
        </SelectField>
      )}
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onDone} className="btn-secondary">
          Cancelar
        </button>
        {jogos.length > 0 ? <SubmitButton label="Salvar atividade" pendingLabel="Salvando..." /> : null}
      </div>
    </form>
  );
}

/**
 * "+ Nova Atividade" (ver mockup aprovado) — o tipo escolhido decide qual dos dois formulários (e
 * dos dois Server Actions) aparece: geral, ou Jogo Oficial/Jogo Treino com o seletor de jogo.
 */
export function NovaAtividadeModal({
  categoria,
  jogosParaSelecao,
  onClose,
}: {
  categoria: CategoriaBase;
  jogosParaSelecao: JogoResumoAtividade[];
  onClose: () => void;
}) {
  const [tipo, setTipo] = useState<string>(PROGRAMACAO_ATIVIDADE_TIPO_OPTIONS[0].value);
  const ehJogo = tipo === "jogo_oficial" || tipo === "jogo_treino";

  return (
    <ModalShell titulo="Nova Atividade" onClose={onClose}>
      <div className="mb-4">
        <label htmlFor="na-tipo-seletor" className="field-label">
          Tipo de atividade
        </label>
        <select
          id="na-tipo-seletor"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="field-input"
        >
          {PROGRAMACAO_ATIVIDADE_TIPO_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
          <option value="jogo_oficial">Jogo Oficial</option>
          <option value="jogo_treino">Jogo Treino</option>
        </select>
      </div>

      {ehJogo ? (
        <FormularioAtividadeDeJogo
          categoria={categoria}
          tipo={tipo as "jogo_oficial" | "jogo_treino"}
          jogos={jogosParaSelecao}
          onDone={onClose}
        />
      ) : (
        <FormularioAtividadeGeral categoria={categoria} tipoInicial={tipo} onDone={onClose} />
      )}
    </ModalShell>
  );
}
