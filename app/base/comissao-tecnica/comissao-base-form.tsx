"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, SelectField, SuggestionField, TextField } from "@/components/fields";
import { PhotoField } from "@/components/photo-field";
import { SubmitButton } from "@/components/submit-button";
import { SUGESTOES_FUNCAO_COMISSAO } from "@/lib/validation/schemas";
import { CATEGORIAS_BASE } from "@/lib/auth/categorias-base";
import type { ComissaoBaseFormState } from "./actions";

const initialState: ComissaoBaseFormState = {};

/** Espelha `app/comissao-tecnica/comissao-form.tsx`, com os campos Categoria(s) (uma pessoa pode
 * atuar em mais de uma — checkboxes, não um único `<select>`, ver docs/superpowers/specs/
 * 2026-08-19-comissao-tecnica-multi-categoria-design.md) e Salário mensal (opcional — usado no
 * Gasto Geral da Base, ver docs/superpowers/specs/2026-08-19-financeiro-base-design.md). */
export function ComissaoBaseForm({
  action,
  entityId,
  defaultValues,
  categoriasIniciais,
  fotoUrl,
  submitLabel,
}: {
  action: (prevState: ComissaoBaseFormState, formData: FormData) => Promise<ComissaoBaseFormState>;
  entityId?: string;
  defaultValues?: Record<string, string>;
  categoriasIniciais?: string[];
  fotoUrl?: string | null;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const values = state.values ?? defaultValues ?? {};
  const errors = state.fieldErrors ?? {};
  const categoriasSelecionadas = state.categoriasSelecionadas ?? categoriasIniciais ?? [];

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
      {entityId ? <input type="hidden" name="id" value={entityId} /> : null}
      <FormSection title="Dados pessoais">
        <FieldGroup>
          <TextField
            label="Nome completo"
            name="nomeCompleto"
            required
            defaultValue={values.nomeCompleto}
            error={errors.nomeCompleto}
          />
          <TextField
            label="Apelido"
            name="apelido"
            defaultValue={values.apelido}
            error={errors.apelido}
            placeholder="Como a pessoa é chamada no dia a dia"
          />
          <TextField label="RG" name="rg" required defaultValue={values.rg} error={errors.rg} />
          <TextField
            label="CPF"
            name="cpf"
            required
            placeholder="000.000.000-00"
            defaultValue={values.cpf}
            error={errors.cpf}
          />
          <TextField
            label="Data de nascimento"
            name="dataNascimento"
            type="date"
            required
            defaultValue={values.dataNascimento}
            error={errors.dataNascimento}
          />
          <TextField
            label="Telefone"
            name="telefone"
            defaultValue={values.telefone}
            error={errors.telefone}
          />
          <TextField
            label="E-mail"
            name="email"
            type="email"
            defaultValue={values.email}
            error={errors.email}
          />
          <div className="sm:col-span-2">
            <PhotoField label="Foto (opcional)" name="foto" currentUrl={fotoUrl} />
          </div>
        </FieldGroup>
      </FormSection>

      <FormSection title="Função">
        <FieldGroup>
          <div className="sm:col-span-2">
            <p className="field-label">
              Categoria(s)<span className="text-red-700"> *</span>
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CATEGORIAS_BASE.map((cat) => (
                <label key={cat.value} className="flex items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    name="categorias"
                    value={cat.value}
                    defaultChecked={categoriasSelecionadas.includes(cat.value)}
                    className="h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena"
                  />
                  {cat.label}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              Marque mais de uma se a pessoa atua em mais de uma categoria (ex.: mesmo treinador no
              Sub-11 e no Sub-12) — o salário mensal abaixo é dividido igualmente entre elas no
              Financeiro.
            </p>
            {errors.categorias ? <p className="field-error">{errors.categorias}</p> : null}
          </div>
          <SuggestionField
            label="Função/cargo"
            name="funcao"
            required
            defaultValue={values.funcao}
            error={errors.funcao}
            suggestions={SUGESTOES_FUNCAO_COMISSAO}
          />
          <SelectField
            label="Tipo de quarto preferido (jogos fora)"
            name="tipoQuartoPreferido"
            defaultValue={values.tipoQuartoPreferido}
            error={errors.tipoQuartoPreferido}
          >
            <option value="">Não definido</option>
            <option value="single">Single</option>
            <option value="duplo">Duplo</option>
          </SelectField>
          <TextField
            label="Salário mensal (R$)"
            name="valorSalario"
            type="number"
            min={0}
            step="0.01"
            defaultValue={values.valorSalario}
            error={errors.valorSalario}
          />
        </FieldGroup>
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
