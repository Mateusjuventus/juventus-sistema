"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextAreaField, TextField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { TAREFA_CATEGORIAS, TAREFA_STATUS } from "@/lib/validation/schemas";
import type { TarefaFormState } from "./actions";

const initialState: TarefaFormState = {};

export function TarefaForm({
  action,
  entityId,
  defaultValues,
  submitLabel,
  categoriasPermitidas,
}: {
  action: (prevState: TarefaFormState, formData: FormData) => Promise<TarefaFormState>;
  entityId?: string;
  defaultValues?: Record<string, string>;
  submitLabel: string;
  /** Categorias que aparecem no seletor — o restante das 5 fixas fica de fora conforme o que foi
   * liberado pra esse usuário em /usuarios (ver lib/auth/tarefas-categorias.ts). Se vier vazia,
   * mostra todas (evita um seletor sem nenhuma opção). */
  categoriasPermitidas?: string[];
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues ?? {};
  const errors = state.fieldErrors ?? {};
  // Sempre mantém a categoria já salva na lista, mesmo que não esteja mais liberada pra esse
  // usuário — senão editar uma tarefa antiga de outra categoria "perderia" a categoria dela no
  // seletor. Fora isso, só mostra as categorias liberadas (ou todas, se nada foi restringido).
  const opcoesCategoria = TAREFA_CATEGORIAS.filter(
    (c) =>
      !categoriasPermitidas ||
      categoriasPermitidas.length === 0 ||
      categoriasPermitidas.includes(c.value) ||
      c.value === values.categoria,
  );

  return (
    <form action={formAction} className="space-y-6">
      {entityId ? <input type="hidden" name="id" value={entityId} /> : null}
      <FormSection title="Dados da tarefa">
        <FieldGroup>
          <TextField
            label="Título"
            name="titulo"
            required
            defaultValue={values.titulo}
            error={errors.titulo}
          />
          <SelectField
            label="Categoria"
            name="categoria"
            required
            defaultValue={values.categoria}
            error={errors.categoria}
          >
            <option value="">Selecione...</option>
            {opcoesCategoria.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Status"
            name="status"
            defaultValue={values.status ?? "pendente"}
            error={errors.status}
          >
            {TAREFA_STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Prazo"
            name="prazo"
            type="date"
            defaultValue={values.prazo}
            error={errors.prazo}
          />
        </FieldGroup>
        <TextAreaField
          label="Descrição"
          name="descricao"
          defaultValue={values.descricao}
          error={errors.descricao}
        />
      </FormSection>

      {state.error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
