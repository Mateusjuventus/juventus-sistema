"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { SelectField } from "@/components/fields";
import { SubmitButton } from "@/components/submit-button";
import { CATEGORIAS_BASE, categoriaComissaoTecnicaLabel, ehCategoriaBaseValida } from "@/lib/auth/categorias-base";
import type { ComissaoTecnicaParaSelecao } from "@/lib/auth/perfis";
import type { PermissaoActionState } from "@/components/permissao-checkboxes-form";

const initialState: PermissaoActionState = {};

const CHECKBOX_CLASS = "h-4 w-4 rounded border-neutral-300 text-grena focus:ring-grena";

/**
 * Vínculo de um usuário já existente com a Comissão Técnica — desde a unificação (ver
 * docs/superpowers/specs/2026-10-28-unificacao-comissao-tecnica-design.md) é um `<select>` só
 * (antes eram dois, um por departamento, porque existiam duas tabelas/FKs separadas; agora a
 * mesma pessoa pode estar em "profissional" e em categorias da Base ao mesmo tempo, então um
 * vínculo só já cobre os dois). A lista mostrada é filtrada pelos departamentos que este login tem
 * liberado. Vincular a alguém com categoria(s) da Base esconde os checkboxes de categoria (que
 * passam a vir ao vivo do cadastro vinculado) e mostra as categorias dele como referência. Não dá
 * pra reaproveitar `PermissaoCheckboxesForm` aqui (é só-checkboxes, sem select).
 */
export function VinculoComissaoTecnicaForm({
  id,
  departamentosPermitidos,
  comissaoTecnica,
  comissaoTecnicaIdAtual,
  categoriasBasePermitidasAtuais,
  action,
}: {
  id: string;
  departamentosPermitidos: string[];
  comissaoTecnica: ComissaoTecnicaParaSelecao[];
  comissaoTecnicaIdAtual: string | null;
  categoriasBasePermitidasAtuais: string[];
  action: (prevState: PermissaoActionState, formData: FormData) => Promise<PermissaoActionState>;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const [comissaoTecnicaId, setComissaoTecnicaId] = useState(comissaoTecnicaIdAtual ?? "");

  const temProfissional = departamentosPermitidos.includes("futebol_profissional");
  const temBase = departamentosPermitidos.includes("futebol_base");
  if (!temProfissional && !temBase) return null;

  // Só mostra, pra escolher, quem faz sentido pros departamentos liberados deste login — alguém só
  // "profissional" não aparece pra quem só tem Base liberado, e vice-versa; quem tem os dois
  // departamentos liberados vê todo mundo.
  const opcoes = comissaoTecnica.filter((p) => {
    const temCategoriaBase = p.categorias.some(ehCategoriaBaseValida);
    const temCategoriaProfissional = p.categorias.includes("profissional");
    return (temProfissional && temCategoriaProfissional) || (temBase && temCategoriaBase);
  });

  const pessoaSelecionada = opcoes.find((p) => p.id === comissaoTecnicaId);
  const categoriasBaseDaPessoa = pessoaSelecionada?.categorias.filter(ehCategoriaBaseValida) ?? [];

  return (
    <form action={formAction} className="space-y-3 border-t border-neutral-100 pt-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Vínculo com a Comissão Técnica
      </p>

      <div>
        <SelectField
          label="Comissão Técnica"
          name="comissaoTecnicaId"
          defaultValue={comissaoTecnicaIdAtual ?? ""}
          onChange={(value) => setComissaoTecnicaId(value)}
        >
          <option value="">— Não vincular (preencher manualmente) —</option>
          {opcoes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.rotulo} ({p.categorias.map(categoriaComissaoTecnicaLabel).join(", ")})
            </option>
          ))}
        </SelectField>

        {temBase ? (
          pessoaSelecionada && categoriasBaseDaPessoa.length > 0 ? (
            <p className="mt-2 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
              Categorias vinculadas: {categoriasBaseDaPessoa.map(categoriaComissaoTecnicaLabel).join(", ")}
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
          )
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label="Salvar vínculo" pendingLabel="Salvando..." className="btn-secondary btn-sm" />
        {state.success ? <span className="text-xs font-medium text-emerald-700">{state.success}</span> : null}
        {state.error ? <span className="text-xs font-medium text-red-700">{state.error}</span> : null}
      </div>
    </form>
  );
}
