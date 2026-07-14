"use client";

import { useState } from "react";
import { NOVA_CATEGORIA_GASTO_VALUE } from "@/lib/validation/schemas";
import type { CategoriaGastoRow } from "@/lib/supabase/types";

/**
 * Campo de categoria de gasto: um select alimentado pelo catálogo (categorias_gasto), com uma
 * opção para cadastrar uma categoria nova na hora — mesmo padrão já usado na função/setor do
 * Staff Operacional (ver components/staff-funcao-field.tsx).
 */
export function CategoriaGastoField({
  categorias,
  defaultValue,
  error,
  novaCategoriaError,
}: {
  categorias: CategoriaGastoRow[];
  defaultValue?: string;
  error?: string;
  novaCategoriaError?: string;
}) {
  const [criandoNova, setCriandoNova] = useState(defaultValue === NOVA_CATEGORIA_GASTO_VALUE);

  return (
    <div>
      <label htmlFor="categoriaId" className="field-label">
        Categoria<span className="text-red-700"> *</span>
      </label>
      <select
        id="categoriaId"
        name="categoriaId"
        required
        defaultValue={defaultValue ?? ""}
        className="field-input"
        onChange={(e) => setCriandoNova(e.target.value === NOVA_CATEGORIA_GASTO_VALUE)}
      >
        <option value="" disabled>
          Selecione uma categoria
        </option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
        <option value={NOVA_CATEGORIA_GASTO_VALUE}>+ Cadastrar nova categoria...</option>
      </select>
      {error ? <p className="field-error">{error}</p> : null}

      {criandoNova ? (
        <div className="mt-2">
          <input
            name="novaCategoriaNome"
            required
            placeholder="Nome da nova categoria"
            className="field-input"
          />
          {novaCategoriaError ? <p className="field-error">{novaCategoriaError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
