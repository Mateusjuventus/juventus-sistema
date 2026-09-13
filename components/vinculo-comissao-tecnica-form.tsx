"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { SelectField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { CATEGORIAS_BASE, categoriaBaseLabel } from "@/lib/auth/categorias-base";
import type { ComissaoTecnicaParaSelecao } from "@/lib/auth/perfis";
import type { PermissaoActionState } from "@/components/permissao-checkboxes-form";

const initialState: PermissaoActionState = {};

const CHECKBOX_CLASS = "h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena";

/**
 * Vínculo de um usuário já existente com a Comissão Técnica (Profissional e/ou Base) — ver
 * docs/superpowers/specs/2026-09-13-acesso-por-categoria-comissao-tecnica-design.md. Mostra um
 * `<select>` por departamento que o perfil tem liberado; vincular à Base esconde os checkboxes de
 * categoria (que passam a vir ao vivo do cadastro vinculado) e mostra as categorias dele como
 * referência. Não dá pra reaproveitar `PermissaoCheckboxesForm` aqui (é só-checkboxes, sem select).
 */
export function VinculoComissaoTecnicaForm({
  id,
  departamentosPermitidos,
  comissaoTecnica,
  comissaoTecnicaBase,
  comissaoTecnicaIdAtual,
  comissaoTecnicaBaseIdAtual,
  categoriasBasePermitidasAtuais,
  action,
}: {
  id: string;
  departamentosPermitidos: string[];
  comissaoTecnica: ComissaoTecnicaParaSelecao[];
  comissaoTecnicaBase: ComissaoTecnicaParaSelecao[];
  comissaoTecnicaIdAtual: string | null;
  comissaoTecnicaBaseIdAtual: string | null;
  categoriasBasePermitidasAtuais: string[];
  action: (prevState: PermissaoActionState, formData: FormData) => Promise<PermissaoActionState>;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const [comissaoTecnicaBaseId, setComissaoTecnicaBaseId] = useState(comissaoTecnicaBaseIdAtual ?? "");
  const pessoaBaseSelecionada = comissaoTecnicaBase.find((p) => p.id === comissaoTecnicaBaseId);

  if (!departamentosPermitidos.includes("futebol_profissional") && !departamentosPermitidos.includes("futebol_base")) {
    return null;
  }

  return (
    <form action={formAction} className="space-y-3 border-t border-neutral-100 pt-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Vínculo com a Comissão Técnica
      </p>

      {departamentosPermitidos.includes("futebol_profissional") ? (
        <div>
          <SelectField
            label="Comissão Técnica (Profissional)"
            name="comissaoTecnicaId"
            defaultValue={comissaoTecnicaIdAtual ?? ""}
          >
            <option value="">— Não vincular (preencher manualmente) —</option>
            {comissaoTecnica.map((p) => (
              <option key={p.id} value={p.id}>
                {p.rotulo}
              </option>
            ))}
          </SelectField>
        </div>
      ) : null}

      {departamentosPermitidos.includes("futebol_base") ? (
        <div>
          <SelectField
            label="Comissão Técnica (Base)"
            name="comissaoTecnicaBaseId"
            defaultValue={comissaoTecnicaBaseIdAtual ?? ""}
            onChange={(value) => setComissaoTecnicaBaseId(value)}
          >
            <option value="">— Não vincular (preencher manualmente) —</option>
            {comissaoTecnicaBase.map((p) => (
              <option key={p.id} value={p.id}>
                {p.rotulo}
              </option>
            ))}
          </SelectField>

          {pessoaBaseSelecionada ? (
            <p className="mt-2 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
              Categorias vinculadas: {(pessoaBaseSelecionada.categorias ?? []).map(categoriaBaseLabel).join(", ")}
            </p>
          ) : (
            <div className="mt-2">
              <p className="field-label">Categorias do Futebol de Base liberadas</p>
              <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CATEGORIAS_BASE.map((cat) => (
                  <label key={cat.value} className="flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      name="categoriasBasePermitidas"
                      value={cat.value}
                      defaultChecked={categoriasBasePermitidasAtuais.includes(cat.value)}
                      className={CHECKBOX_CLASS}
                    />
                    {cat.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label="Salvar vínculo" pendingLabel="Salvando..." className="btn-secondary btn-sm" />
        {state.success ? <span className="text-xs font-medium text-emerald-700">{state.success}</span> : null}
        {state.error ? <span className="text-xs font-medium text-red-700">{state.error}</span> : null}
      </div>
    </form>
  );
}
