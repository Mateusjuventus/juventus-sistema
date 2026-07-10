"use client";

import { useState } from "react";
import { NOVA_FUNCAO_VALUE } from "@/lib/validation/schemas";
import type { StaffFuncaoCatalogoRow } from "@/lib/supabase/types";

/**
 * Campo de função/setor do Staff Operacional: um select alimentado pelo catálogo
 * (staff_funcoes_catalogo), com uma opção para cadastrar uma função nova na hora — sem sair da tela
 * nem depender de alteração no código.
 */
export function StaffFuncaoField({
  funcoes,
  defaultValue,
  error,
  novaFuncaoError,
}: {
  funcoes: StaffFuncaoCatalogoRow[];
  defaultValue?: string;
  error?: string;
  novaFuncaoError?: string;
}) {
  const [criandoNova, setCriandoNova] = useState(defaultValue === NOVA_FUNCAO_VALUE);

  return (
    <div>
      <label htmlFor="funcaoId" className="field-label">
        Função/setor<span className="text-red-700"> *</span>
      </label>
      <select
        id="funcaoId"
        name="funcaoId"
        required
        defaultValue={defaultValue ?? ""}
        className="field-input"
        onChange={(e) => setCriandoNova(e.target.value === NOVA_FUNCAO_VALUE)}
      >
        <option value="" disabled>
          Selecione uma função
        </option>
        {funcoes.map((f) => (
          <option key={f.id} value={f.id}>
            {f.nome}
          </option>
        ))}
        <option value={NOVA_FUNCAO_VALUE}>+ Cadastrar nova função...</option>
      </select>
      {error ? <p className="field-error">{error}</p> : null}

      {criandoNova ? (
        <div className="mt-2">
          <input
            name="novaFuncaoNome"
            required
            placeholder="Nome da nova função"
            className="field-input"
          />
          {novaFuncaoError ? <p className="field-error">{novaFuncaoError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
