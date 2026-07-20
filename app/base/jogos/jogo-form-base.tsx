"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, TextField } from "@/components/fields";
import { PhotoField } from "@/components/photo-field";
import { SubmitButton } from "@/components/submit-button";
import { CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import type { JogoBaseFormState } from "./actions";

const initialState: JogoBaseFormState = {};

/**
 * Espelha `app/jogos/jogo-form.tsx`, com um campo a mais (Categoria) — obrigatório, e editável
 * mesmo depois de criado (o jogo pode ter sido lançado na categoria errada). Mesmo padrão de
 * `AtletaBaseForm`/`ComissaoBaseForm`.
 */
export function JogoBaseForm({
  action,
  entityId,
  defaultValues,
  logoUrl,
  submitLabel,
}: {
  action: (prevState: JogoBaseFormState, formData: FormData) => Promise<JogoBaseFormState>;
  entityId?: string;
  defaultValues?: Record<string, string>;
  logoUrl?: string | null;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues ?? {};
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
      {entityId ? <input type="hidden" name="id" value={entityId} /> : null}
      <FormSection title="Categoria e adversário">
        <FieldGroup>
          <SelectField
            label="Categoria"
            name="categoria"
            required
            defaultValue={values.categoria}
            error={errors.categoria}
          >
            <option value="">Selecione</option>
            {CATEGORIAS_BASE.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Competição"
            name="competicao"
            required
            defaultValue={values.competicao}
            error={errors.competicao}
          />
          <TextField
            label="Rodada/Fase"
            name="rodadaFase"
            defaultValue={values.rodadaFase}
            error={errors.rodadaFase}
          />
          <TextField
            label="Adversário"
            name="adversarioNome"
            required
            defaultValue={values.adversarioNome}
            error={errors.adversarioNome}
          />
          <div className="sm:col-span-2">
            <PhotoField
              label="Logo do adversário"
              name="adversarioLogo"
              currentUrl={logoUrl}
              shape="square"
            />
          </div>
        </FieldGroup>
      </FormSection>

      <FormSection title="Data e local">
        <FieldGroup>
          <TextField
            label="Data do jogo"
            name="dataJogo"
            type="date"
            required
            defaultValue={values.dataJogo}
            error={errors.dataJogo}
          />
          <TextField
            label="Horário"
            name="horario"
            type="time"
            defaultValue={values.horario}
            error={errors.horario}
          />
          <TextField
            label="Local/Estádio"
            name="localEstadio"
            defaultValue={values.localEstadio}
            error={errors.localEstadio}
          />
          <TextField
            label="Endereço"
            name="endereco"
            defaultValue={values.endereco}
            error={errors.endereco}
          />
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="mandante"
              name="mandante"
              type="checkbox"
              defaultChecked={values.mandante === "on"}
              className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
            />
            <label htmlFor="mandante" className="text-sm font-medium text-neutral-700">
              Jogo em casa (mandante)
            </label>
          </div>
        </FieldGroup>
      </FormSection>

      <FormSection title="Resultado (preencha depois do jogo)">
        <FieldGroup>
          <TextField
            label="Gols Juventus"
            name="golsPro"
            type="number"
            min={0}
            defaultValue={values.golsPro}
            error={errors.golsPro}
          />
          <TextField
            label="Gols adversário"
            name="golsContra"
            type="number"
            min={0}
            defaultValue={values.golsContra}
            error={errors.golsContra}
          />
        </FieldGroup>
        <p className="text-xs text-neutral-500">
          Deixe em branco até o jogo acontecer. Esses números alimentam o dashboard de resultados.
        </p>
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
