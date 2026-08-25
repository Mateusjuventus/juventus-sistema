"use client";

import { useState } from "react";

/** Remove tudo que não for dígito, limitando a 11 (tamanho de um CPF). */
function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, 11);
}

/** Formata os dígitos digitados até agora como "000.000.000-00", crescendo a máscara conforme a
 * pessoa digita (ao contrário de `formatCPF` de `lib/validation/cpf.ts`, que só formata um CPF já
 * completo com 11 dígitos — aqui precisamos do resultado parcial pra mostrar em tempo real). */
function formatarProgressivo(digitos: string): string {
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
  if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

/**
 * Núcleo do campo de CPF que se formata sozinho enquanto a pessoa digita (ex.: digitar
 * 5-2-9-9-8... mostra "529.982..." e assim por diante, terminando em "529.982.247-25" com os 11
 * dígitos) — pedido do Mateus pra sempre pontuar ao preencher e evitar "bagunça". Mesmo padrão de
 * `CurrencyInput` (`components/currency-field.tsx`): um input visível formatado e um
 * `<input type="hidden">` por baixo com o mesmo `name` carregando só os dígitos — o schema
 * (`cpfField`/`normalizeCPF`) e as Server Actions continuam funcionando sem mudança nenhuma.
 * Sem label nem wrapper — use `CpfField` no caso comum (dentro de um FieldGroup).
 */
export function CpfInput({
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
  const [digitos, setDigitos] = useState<string>(() => apenasDigitos(defaultValue ?? ""));
  const exibicao = formatarProgressivo(digitos);

  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={exibicao}
        onChange={(e) => setDigitos(apenasDigitos(e.target.value))}
        placeholder="000.000.000-00"
        required={required}
        className={className ?? "field-input"}
      />
      <input type="hidden" name={name} value={digitos} />
    </>
  );
}

/** Campo de CPF com label — versão comum, pra usar dentro de um FieldGroup igual aos outros campos
 * de `components/fields.tsx`. Ver `CpfInput` acima para os detalhes da máscara. */
export function CpfField({
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
      <CpfInput name={name} id={fieldId} defaultValue={defaultValue} required={required} />
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
