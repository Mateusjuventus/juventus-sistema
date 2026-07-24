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
  name = "funcaoId",
  novaFuncaoNomeField = "novaFuncaoNome",
  label = "Função/setor",
  required = true,
}: {
  funcoes: StaffFuncaoCatalogoRow[];
  defaultValue?: string;
  error?: string;
  novaFuncaoError?: string;
  /** Nome do campo do select no FormData — por padrão `funcaoId` (o campo original, obrigatório em
   * todo staff). Uma segunda instância deste componente (ex: função da terceirizada) usa um nome
   * diferente pra não colidir com essa. */
  name?: string;
  /** Idem, pro campo de texto de "+ Cadastrar nova função...". */
  novaFuncaoNomeField?: string;
  label?: string;
  required?: boolean;
}) {
  const [criandoNova, setCriandoNova] = useState(defaultValue === NOVA_FUNCAO_VALUE);

  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="field-input"
        onChange={(e) => setCriandoNova(e.target.value === NOVA_FUNCAO_VALUE)}
      >
        <option value="" disabled={required}>
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
            name={novaFuncaoNomeField}
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
