"use client";

import { useState } from "react";

/** Só os dígitos de uma string, sem sinal nem separadores — usado como "fonte da verdade" do valor
 * digitado (os últimos 2 dígitos são sempre os centavos, como numa calculadora). */
function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

function digitosParaNumero(digitos: string): number {
  return digitos ? Number(digitos) / 100 : 0;
}

function digitosParaExibicao(digitos: string): string {
  if (!digitos) return "";
  return digitosParaNumero(digitos).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Converte um valor inicial (number vindo do banco, ou string) nos dígitos correspondentes —
 * inverso de digitosParaNumero, pra pré-preencher o campo na edição. */
function valorParaDigitos(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "";
  const num = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(num)) return "";
  return Math.round(num * 100).toString();
}

/**
 * Núcleo do campo de valor em reais que se formata sozinho enquanto a pessoa digita, como numa
 * calculadora: os dígitos digitados preenchem da direita pra esquerda, os 2 últimos sempre viram
 * centavos (ex.: digitar 1-2-0-0-0 mostra R$ 1,20 → R$ 12,00 → R$ 120,00 → R$ 1.200,00). Evita o
 * erro comum de digitar num campo numérico comum e sair um valor 100x maior ou menor do que a
 * intenção. Sem label nem wrapper — use `CurrencyField` no caso comum (dentro de um FieldGroup);
 * use `CurrencyInput` direto só quando o layout já fornece o rótulo por fora (ex.: cabeçalho de
 * coluna de uma tabela, como em ReciboForm).
 *
 * Por baixo, guarda um input escondido com o mesmo `name`, sempre em formato decimal puro (ex.:
 * "12000.00") — o schema de validação (z.coerce.number()) e as actions que já existem no resto do
 * sistema continuam funcionando sem nenhuma mudança, só o campo visível na tela mudou.
 */
export function CurrencyInput({
  name,
  id,
  defaultValue,
  className,
}: {
  name: string;
  id?: string;
  defaultValue?: string | number | null;
  className?: string;
}) {
  const [digitos, setDigitos] = useState<string>(() => valorParaDigitos(defaultValue));
  const exibicao = digitosParaExibicao(digitos);
  const valorBruto = digitos ? digitosParaNumero(digitos).toFixed(2) : "";

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
        R$
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={exibicao}
        onChange={(e) => setDigitos(apenasDigitos(e.target.value))}
        placeholder="0,00"
        className={className ?? "field-input pl-9"}
      />
      <input type="hidden" name={name} value={valorBruto} />
    </div>
  );
}

/** Campo de valor em reais com label — versão comum, pra usar dentro de um FieldGroup igual aos
 * outros campos de `components/fields.tsx`. Ver `CurrencyInput` acima para os detalhes da máscara. */
export function CurrencyField({
  label,
  name,
  id,
  required,
  defaultValue,
  error,
}: {
  label: string;
  name: string;
  /** Opcional — usar quando o mesmo `name` se repete em várias linhas de um formulário dinâmico
   * (ex.: itens de uma lista), pra cada linha ter um `id`/`htmlFor` único. */
  id?: string;
  required?: boolean;
  defaultValue?: string | number | null;
  error?: string;
}) {
  const fieldId = id ?? name;
  return (
    <div>
      <label htmlFor={fieldId} className="field-label">
        {label}
        {required ? <span className="text-red-700"> *</span> : null}
      </label>
      <CurrencyInput name={name} id={fieldId} defaultValue={defaultValue} className="field-input pl-9" />
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
