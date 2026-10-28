"use client";

import { useFormState } from "react-dom";
import { FieldGroup, FormSection, TextField, SuggestionField, SelectField } from "@/components/fields";
import { PhotoField } from "@/components/photo-field";
import { CpfField } from "@/components/cpf-field";
import { TelefoneField } from "@/components/telefone-field";
import { CurrencyField } from "@/components/currency-field";
import { SubmitButton } from "@/components/submit-button";
import { COMISSAO_TECNICA_TIPO_CONTRATO_OPTIONS, SUGESTOES_FUNCAO_COMISSAO } from "@/lib/validation/schemas";
import { CATEGORIAS_COMISSAO_TECNICA } from "@/lib/auth/categorias-base";
import type { ComissaoFormState } from "./actions";

const initialState: ComissaoFormState = {};

/** Cadastro único da Comissão Técnica/Diretoria — desde a unificação (ver docs/superpowers/specs/
 * 2026-10-28-unificacao-comissao-tecnica-design.md), "Profissional" é só mais uma categoria ao
 * lado das 7 da Base (checkboxes, não um único `<select>` — a mesma pessoa pode acumular mais de
 * uma, ex.: coordenador que acompanha o Profissional e o Sub-20). Substitui os dois formulários
 * que existiam antes (este e `app/base/comissao-tecnica/comissao-base-form.tsx`, agora removido). */
export function ComissaoForm({
  action,
  entityId,
  defaultValues,
  categoriasIniciais,
  fotoUrl,
  submitLabel,
  podeVerSalario = true,
}: {
  action: (prevState: ComissaoFormState, formData: FormData) => Promise<ComissaoFormState>;
  entityId?: string;
  defaultValues?: Record<string, string>;
  categoriasIniciais?: string[];
  fotoUrl?: string | null;
  submitLabel: string;
  /** `false` quando este usuário tem "Salário" marcado como campo escondido (ver docs/superpowers/
   * specs/2026-10-02-campos-sensiveis-e-atletas-por-categoria-design.md) — o campo some do
   * formulário (nem o valor atual é passado em `defaultValues` por quem chama) e, por não ser
   * enviado no `formData`, o salário salvo no banco não é alterado ao gravar o resto do cadastro. */
  podeVerSalario?: boolean;
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
          <CpfField label="CPF" name="cpf" required defaultValue={values.cpf} error={errors.cpf} />
          <TextField
            label="Data de nascimento"
            name="dataNascimento"
            type="date"
            required
            defaultValue={values.dataNascimento}
            error={errors.dataNascimento}
          />
          <TelefoneField label="Telefone" name="telefone" defaultValue={values.telefone} error={errors.telefone} />
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
              {CATEGORIAS_COMISSAO_TECNICA.map((cat) => (
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
              Marque mais de uma se a pessoa atua em mais de uma categoria (ex.: coordenador que
              acompanha o Profissional e o Sub-20) — o salário mensal abaixo é dividido igualmente
              entre as categorias da Base marcadas no Financeiro da Base (ver
              docs/superpowers/specs/2026-08-19-financeiro-base-design.md).
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
            label="Tipo de contrato"
            name="tipoContrato"
            defaultValue={values.tipoContrato}
            error={errors.tipoContrato}
          >
            <option value="">Não definido</option>
            {COMISSAO_TECNICA_TIPO_CONTRATO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
          {podeVerSalario ? (
            <CurrencyField
              label="Salário mensal"
              name="valorSalario"
              defaultValue={values.valorSalario}
              error={errors.valorSalario}
            />
          ) : null}
          <TextField
            label="Quando iniciou"
            name="dataInicio"
            type="date"
            defaultValue={values.dataInicio}
            error={errors.dataInicio}
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
