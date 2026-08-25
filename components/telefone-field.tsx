"use client";

import { useState } from "react";
import { formatTelefone, normalizeTelefone } from "@/lib/validation/telefone";

/**
 * Núcleo do campo de telefone que se formata sozinho enquanto a pessoa digita — cresce de
 * "(00) 0000-0000" pra "(00) 00000-0000" assim que o 11º dígito é digitado (ver
 * `lib/validation/telefone.ts`). Mesmo padrão de `CpfInput`/`CurrencyInput`: um input visível
 * formatado e um `<input type="hidden">` por baixo com o mesmo `name` carregando só os dígitos.
 * Sem label nem wrapper — use `TelefoneField` no caso comum (dentro de um FieldGroup).
 */
export function TelefoneInput({
  name,
  id,
  defaultValue,
  required,
  className,
}: {
  name: string;
  id?: string;
  defaultValue?: string | null;
  required?: boolean;
  className?: string;
}) {
  const [digitos, setDigitos] = useState<string>(() => normalizeTelefone(defaultValue ?? ""));
  const exibicao = formatTelefone(digitos);

  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={exibicao}
        onChange={(e) => setDigitos(normalizeTelefone(e.target.value))}
        placeholder="(00) 00000-0000"
        required={required}
        className={className ?? "field-input"}
      />
      <input type="hidden" name={name} value={digitos} />
    </>
  );
}

/** Campo de telefone com label — versão comum, pra usar dentro de um FieldGroup igual aos outros
 * campos de `components/fields.tsx`. Ver `TelefoneInput` acima para os detalhes da máscara. */
export function TelefoneField({
  label,
  name,
  id,
  required,
  defaultValue,
  error,
}: {
  label: string;
  name: string;
  id?: string;
  required?: boolean;
  defaultValue?: string | null;
  error?: string;
}) {
  const fieldId = id ?? name;
  return (
    <div>
      <label htmlFor={fieldId} className="field-label">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>
      <TelefoneInput name={name} id={fieldId} defaultValue={defaultValue} required={required} />
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
