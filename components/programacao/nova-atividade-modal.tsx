"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { ModalShell } from "./modal";
import { useFecharAoSalvar } from "./use-fechar-ao-salvar";
import { SubmitButton } from "@/components/submit-button";
import { TextField, SelectField } from "@/components/fields";
import {
  criarAtividade,
  criarAtividadeDeJogo,
  atualizarAtividade,
  atualizarAtividadeDeJogo,
  type ProgramacaoFormState,
} from "@/lib/programacao/actions";
import { PROGRAMACAO_ATIVIDADE_TIPO_OPTIONS } from "@/lib/validation/schemas";
import type { AtividadeComDetalhes, JogoResumoAtividade } from "@/lib/programacao/queries";
import type { CategoriaBase } from "@/lib/auth/categorias-base";

const ESTADO_INICIAL: ProgramacaoFormState = {};

function formatJogoOpcao(jogo: JogoResumoAtividade): string {
  const [, mes, dia] = jogo.data_jogo.split("-");
  const lado = jogo.mandante ? "casa" : "fora";
  return `${dia}/${mes} — ${jogo.mandante ? "Juventus" : jogo.adversario_nome} × ${jogo.mandante ? jogo.adversario_nome : "Juventus"} (${lado})`;
}

/** Formulário pra qualquer tipo que não seja Jogo Oficial/Jogo Treino. O tipo já foi escolhido no
 * seletor único acima (ver `AtividadeFormModal`) — aqui ele só viaja como campo oculto, nunca um
 * segundo seletor visível (bug relatado pelo Mateus em 18/09: "Tipo de atividade" aparecia
 * duplicado, um pra decidir o formulário e outro dentro dele). */
function FormularioAtividadeGeral({
  categoria,
  tipo,
  action,
  atividadeId,
  defaultValues,
  onDone,
}: {
  categoria: CategoriaBase;
  tipo: string;
  action: (prevState: ProgramacaoFormState, formData: FormData) => Promise<ProgramacaoFormState>;
  /** Presente só ao editar — inclui o `id` como campo oculto pra `atualizarAtividade` saber qual
   * atividade alterar. */
  atividadeId?: string;
  defaultValues?: { nome: string; data: string; horarioInicio: string; horarioTermino: string; local: string };
  onDone: () => void;
}) {
  const [state, formAction] = useFormState(action, ESTADO_INICIAL);
  useFecharAoSalvar(state, onDone);

  return (
    <form action={formAction} className="space-y-4">
      {atividadeId ? <input type="hidden" name="id" value={atividadeId} /> : null}
      <input type="hidden" name="categoria" value={categoria} />
      <input type="hidden" name="tipo" value={tipo} />
      <TextField
        label="Nome da atividade"
        name="nome"
        required
        defaultValue={defaultValues?.nome}
        error={state.fieldErrors?.nome}
        placeholder="Ex.: Treino Técnico/Tático"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Data" name="data" type="date" required defaultValue={defaultValues?.data} error={state.fieldErrors?.data} />
        <TextField
          label="Início"
          name="horarioInicio"
          type="time"
          required
          defaultValue={defaultValues?.horarioInicio}
          error={state.fieldErrors?.horarioInicio}
        />
        <TextField
          label="Término"
          name="horarioTermino"
          type="time"
          defaultValue={defaultValues?.horarioTermino}
          error={state.fieldErrors?.horarioTermino}
        />
      </div>
      <TextField
        label="Local"
        name="local"
        defaultValue={defaultValues?.local}
        error={state.fieldErrors?.local}
        placeholder="Ex.: CT Juventus, Sede Social, Rua Javari..."
      />
      {state.error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onDone} className="btn-secondary">
          Cancelar
        </button>
        <SubmitButton label={atividadeId ? "Salvar alterações" : "Salvar atividade"} pendingLabel="Salvando..." />
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
  action,
  atividadeId,
  defaultJogoId,
  onDone,
}: {
  categoria: CategoriaBase;
  tipo: "jogo_oficial" | "jogo_treino";
  jogos: JogoResumoAtividade[];
  action: (prevState: ProgramacaoFormState, formData: FormData) => Promise<ProgramacaoFormState>;
  atividadeId?: string;
  defaultJogoId?: string;
  onDone: () => void;
}) {
  const [state, formAction] = useFormState(action, ESTADO_INICIAL);
  useFecharAoSalvar(state, onDone);

  return (
    <form action={formAction} className="space-y-4">
      {atividadeId ? <input type="hidden" name="id" value={atividadeId} /> : null}
      <input type="hidden" name="categoria" value={categoria} />
      <input type="hidden" name="tipo" value={tipo} />
      {jogos.length === 0 ? (
        <p className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
          Nenhum jogo cadastrado nesta categoria ainda. Cadastre o jogo em Jogos antes de colocá-lo na
          programação.
        </p>
      ) : (
        <SelectField label="Jogo" name="jogoId" required defaultValue={defaultJogoId} error={state.fieldErrors?.jogoId}>
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
        {jogos.length > 0 ? (
          <SubmitButton label={atividadeId ? "Salvar alterações" : "Salvar atividade"} pendingLabel="Salvando..." />
        ) : null}
      </div>
    </form>
  );
}

/**
 * "+ Nova Atividade"/"Editar Atividade" (ver mockup aprovado) — o tipo escolhido no seletor único
 * decide qual dos dois formulários (e dos dois Server Actions, criar ou atualizar) aparece: geral,
 * ou Jogo Oficial/Jogo Treino com o seletor de jogo. `atividadeExistente` presente = modo editar
 * (pedido do Mateus de 18/09 — clicar numa atividade da grade agora abre a opção de editar, tanto
 * em `/treinador` quanto em `/base`, já que os dois usam o mesmo `ProgramacaoView`); ausente = modo
 * criar, exatamente como antes.
 *
 * `key={tipo}` nos dois formulários força remontar o formulário sempre que o tipo muda no seletor
 * de cima — sem isso, o campo oculto "tipo" de um formulário que ficou montado (ex.: trocar de
 * "Treino" pra "Regenerativo", os dois caem em `FormularioAtividadeGeral`) continuaria com o valor
 * antigo até o formulário ser reenviado.
 */
export function AtividadeFormModal({
  categoria,
  jogosParaSelecao,
  atividadeExistente,
  onClose,
}: {
  categoria: CategoriaBase;
  jogosParaSelecao: JogoResumoAtividade[];
  atividadeExistente?: AtividadeComDetalhes;
  onClose: () => void;
}) {
  const [tipo, setTipo] = useState<string>(atividadeExistente?.tipo ?? PROGRAMACAO_ATIVIDADE_TIPO_OPTIONS[0].value);
  const ehJogo = tipo === "jogo_oficial" || tipo === "jogo_treino";
  const ehEdicao = Boolean(atividadeExistente);

  return (
    <ModalShell titulo={ehEdicao ? "Editar Atividade" : "Nova Atividade"} onClose={onClose}>
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
          key={tipo}
          categoria={categoria}
          tipo={tipo as "jogo_oficial" | "jogo_treino"}
          jogos={jogosParaSelecao}
          action={ehEdicao ? atualizarAtividadeDeJogo : criarAtividadeDeJogo}
          atividadeId={atividadeExistente?.id}
          defaultJogoId={atividadeExistente?.jogo_id ?? undefined}
          onDone={onClose}
        />
      ) : (
        <FormularioAtividadeGeral
          key={tipo}
          categoria={categoria}
          tipo={tipo}
          action={ehEdicao ? atualizarAtividade : criarAtividade}
          atividadeId={atividadeExistente?.id}
          defaultValues={
            atividadeExistente
              ? {
                  nome: atividadeExistente.nome,
                  data: atividadeExistente.data,
                  horarioInicio: atividadeExistente.horario_inicio,
                  horarioTermino: atividadeExistente.horario_termino ?? "",
                  local: atividadeExistente.local ?? "",
                }
              : undefined
          }
          onDone={onClose}
        />
      )}
    </ModalShell>
  );
}
